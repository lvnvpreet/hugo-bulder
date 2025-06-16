"""
Model Manager Service
Comprehensive model management, health monitoring, and performance tracking
"""

import asyncio
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Set, Optional
import structlog
import json
import os
from dataclasses import dataclass, field

from .ollama_client import OllamaClient
from ..config.models import (
    MODELS_CONFIG, ESSENTIAL_MODELS, OPTIONAL_MODELS, 
    get_model_specs, resolve_model_alias, get_download_order,
    estimate_memory_requirements
)

logger = structlog.get_logger()

@dataclass
class ModelStatus:
    """Model status tracking"""
    name: str
    status: str  # available, downloading, failed, unknown
    last_tested: Optional[datetime] = None
    test_latency: float = 0.0
    error_count: int = 0
    last_error: Optional[str] = None
    download_progress: float = 0.0
    size_gb: float = 0.0
    memory_usage_gb: float = 0.0
    performance_score: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "status": self.status,
            "last_tested": self.last_tested.isoformat() if self.last_tested else None,
            "test_latency": self.test_latency,
            "error_count": self.error_count,
            "last_error": self.last_error,
            "download_progress": self.download_progress,
            "size_gb": self.size_gb,
            "memory_usage_gb": self.memory_usage_gb,
            "performance_score": self.performance_score
        }

@dataclass
class UsageStats:
    """Model usage statistics"""
    total_requests: int = 0
    successful_requests: int = 0
    total_tokens: int = 0
    total_latency: float = 0.0
    operations: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    last_used: Optional[datetime] = None
    peak_requests_per_hour: int = 0
    average_tokens_per_request: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_requests": self.total_requests,
            "successful_requests": self.successful_requests,
            "success_rate": (self.successful_requests / max(self.total_requests, 1)) * 100,
            "total_tokens": self.total_tokens,
            "average_latency": self.total_latency / max(self.total_requests, 1),
            "average_tokens_per_request": self.average_tokens_per_request,
            "last_used": self.last_used.isoformat() if self.last_used else None,
            "peak_requests_per_hour": self.peak_requests_per_hour,
            "operations": self.operations
        }

class ModelManager:
    """Comprehensive model management and monitoring"""
    
    def __init__(self, ollama_client: OllamaClient):
        self.ollama_client = ollama_client
        self.model_statuses: Dict[str, ModelStatus] = {}
        self.usage_stats: Dict[str, UsageStats] = {}
        self.models_config = MODELS_CONFIG
        
        # Health monitoring
        self.health_check_interval = 300  # 5 minutes
        self.last_health_check = None
        self.overall_health_status = "unknown"
        
        # Performance tracking
        self.performance_history: Dict[str, List[Dict[str, Any]]] = {}
        self.max_history_entries = 100
        
        # Download management
        self.download_queue: List[str] = []
        self.downloading_models: Set[str] = set()
        self.max_concurrent_downloads = 2
        
        # Auto-recovery
        self.auto_recovery_enabled = True
        self.max_recovery_attempts = 3
        self.recovery_attempts: Dict[str, int] = {}
        
        logger.info("ModelManager initialized")
    
    async def initialize_models(self):
        """Initialize and download required models"""
        
        logger.info("Starting model initialization...")
        
        try:
            # Check Ollama connection first
            if not await self.ollama_client.health_check():
                raise Exception("Ollama service is not available")
            
            # Get currently available models
            available_models = await self.ollama_client.list_models()
            logger.info(f"Found {len(available_models)} existing models")
            
            # Initialize status for all models
            all_models = set(ESSENTIAL_MODELS + OPTIONAL_MODELS)
            for model in all_models:
                if model not in self.model_statuses:
                    specs = get_model_specs(model)
                    self.model_statuses[model] = ModelStatus(
                        name=model,
                        status="unknown",
                        size_gb=specs.get("size_gb", 0.0)
                    )
                    self.usage_stats[model] = UsageStats()
            
            # Check status of existing models
            for model in available_models:
                if model in self.model_statuses:
                    await self._test_model_health(model)
            
            # Download essential models that are missing
            essential_missing = [m for m in ESSENTIAL_MODELS if m not in available_models]
            if essential_missing:
                logger.info(f"Downloading {len(essential_missing)} essential models: {essential_missing}")
                await self._download_models_batch(essential_missing)
            
            # Test all models after downloads
            await self._test_all_models()
            
            # Start background monitoring
            asyncio.create_task(self._background_monitoring())
            
            logger.info("Model initialization completed successfully")
            
        except Exception as e:
            logger.error(f"Model initialization failed: {str(e)}")
            raise
    
    async def _download_models_batch(self, models: List[str]):
        """Download multiple models with concurrency control"""
        
        # Sort by priority
        models = get_download_order(models)
        
        # Add to download queue
        for model in models:
            if model not in self.download_queue and model not in self.downloading_models:
                self.download_queue.append(model)
        
        # Process download queue
        await self._process_download_queue()
    
    async def _process_download_queue(self):
        """Process the model download queue with concurrency limits"""
        
        while self.download_queue and len(self.downloading_models) < self.max_concurrent_downloads:
            model = self.download_queue.pop(0)
            self.downloading_models.add(model)
            
            # Start download task
            asyncio.create_task(self._download_model_with_tracking(model))
    
    async def _download_model_with_tracking(self, model_name: str):
        """Download a model with progress tracking and error handling"""
        
        try:
            logger.info(f"Starting download of model: {model_name}")
            
            # Update status
            if model_name in self.model_statuses:
                self.model_statuses[model_name].status = "downloading"
                self.model_statuses[model_name].download_progress = 0.0
            
            # Download with progress tracking
            success = await self.ollama_client.pull_model(model_name)
            
            if success:
                # Test the downloaded model
                await self._test_model_health(model_name)
                logger.info(f"Model {model_name} downloaded and tested successfully")
            else:
                self._handle_model_error(model_name, "Download failed")
                
        except Exception as e:
            error_msg = f"Download failed: {str(e)}"
            self._handle_model_error(model_name, error_msg)
            logger.error(f"Failed to download model {model_name}: {error_msg}")
            
        finally:
            # Remove from downloading set
            self.downloading_models.discard(model_name)
              # Continue processing queue
            if self.download_queue:
                await self._process_download_queue()
    
    async def _test_model_health(self, model_name: str):
        """Test model health and update status"""
        
        try:
            start_time = time.time()
            
            # Simple test prompt
            test_response = await self.ollama_client.generate(
                model=model_name,
                prompt="Say hello",
                max_tokens=50,
                temperature=0.1
            )
            
            latency = time.time() - start_time
            
            # Validate response - just check if we got any response
            response_text = test_response.get("response", "").strip() if test_response else ""
            if test_response and response_text and len(response_text) > 0:
                # Model is healthy
                status = self.model_statuses.get(model_name)
                if status:
                    status.status = "available"
                    status.last_tested = datetime.utcnow()
                    status.test_latency = latency
                    status.error_count = 0
                    status.last_error = None
                    status.download_progress = 100.0
                    
                    # Calculate performance score
                    status.performance_score = self._calculate_performance_score(status, test_response)
                
                logger.info(f"Model {model_name} health test passed (latency: {latency:.3f}s, response: '{response_text[:50]}...')")
                
            else:
                raise Exception(f"Invalid test response: {test_response}")
                
        except Exception as e:
            self._handle_model_error(model_name, f"Health test failed: {str(e)}")
    
    def _calculate_performance_score(self, status: ModelStatus, test_response: Dict[str, Any]) -> float:
        """Calculate model performance score based on various metrics"""
        
        score = 100.0
        
        # Latency penalty (target: under 2 seconds)
        if status.test_latency > 2.0:
            score -= min(30, (status.test_latency - 2.0) * 10)
        
        # Error rate penalty
        if status.error_count > 0:
            score -= min(20, status.error_count * 5)
        
        # Token generation efficiency
        eval_count = test_response.get("eval_count", 0)
        eval_duration = test_response.get("eval_duration", 0)
        if eval_duration > 0:
            tokens_per_second = eval_count / (eval_duration / 1e9)  # Convert nanoseconds
            if tokens_per_second < 10:  # Target: 10+ tokens/second
                score -= min(20, (10 - tokens_per_second) * 2)
        
        return max(0.0, score)
    
    def _handle_model_error(self, model_name: str, error_msg: str):
        """Handle model errors and update status"""
        
        if model_name in self.model_statuses:
            status = self.model_statuses[model_name]
            status.status = "failed"
            status.error_count += 1
            status.last_error = error_msg
            status.last_tested = datetime.utcnow()
        
        # Track recovery attempts
        if model_name not in self.recovery_attempts:
            self.recovery_attempts[model_name] = 0
        
        logger.warning(f"Model {model_name} error: {error_msg}")
    
    async def _test_all_models(self):
        """Test health of all available models"""
        
        available_models = await self.ollama_client.list_models()
        
        # Test models in parallel (but limit concurrency)
        semaphore = asyncio.Semaphore(3)  # Max 3 concurrent tests
        
        async def test_with_semaphore(model):
            async with semaphore:
                await self._test_model_health(model)
        
        tasks = [test_with_semaphore(model) for model in available_models if model in self.model_statuses]
        await asyncio.gather(*tasks, return_exceptions=True)
    
    async def get_best_model(self, category: str) -> str:
        """Get the best available model for a category with fallback logic"""
        
        config = self.models_config.get(category, self.models_config["content_generation"])
        
        # Try models in order: primary, fallback
        candidates = [config["primary"], config["fallback"]]
        
        for model_name in candidates:
            resolved_model = resolve_model_alias(model_name)
            
            if self._is_model_healthy(resolved_model):
                # Track usage for selection
                await self.track_usage(resolved_model, f"get_best_model_{category}")
                return resolved_model
        
        # If no healthy models, try auto-recovery
        if self.auto_recovery_enabled:
            for model_name in candidates:
                resolved_model = resolve_model_alias(model_name)
                if await self._attempt_model_recovery(resolved_model):
                    return resolved_model
        
        # Last resort: return primary model even if unhealthy
        primary_model = resolve_model_alias(config["primary"])
        logger.warning(f"No healthy models available for {category}, returning {primary_model}")
        return primary_model
    
    def _is_model_healthy(self, model_name: str) -> bool:
        """Check if a model is healthy and available"""
        
        status = self.model_statuses.get(model_name)
        if not status:
            return False
        
        # Check status
        if status.status != "available":
            return False
        
        # Check error rate
        if status.error_count > 5:
            return False
        
        # Check last test time (models should be tested within last hour)
        if status.last_tested:
            time_since_test = datetime.utcnow() - status.last_tested
            if time_since_test > timedelta(hours=1):
                return False
        
        # Check performance score
        if status.performance_score < 50:  # Minimum acceptable score
            return False
        
        return True
    
    async def _attempt_model_recovery(self, model_name: str) -> bool:
        """Attempt to recover a failed model"""
        
        if self.recovery_attempts.get(model_name, 0) >= self.max_recovery_attempts:
            logger.warning(f"Max recovery attempts reached for {model_name}")
            return False
        
        try:
            logger.info(f"Attempting recovery for model: {model_name}")
            
            # Increment recovery attempt counter
            self.recovery_attempts[model_name] = self.recovery_attempts.get(model_name, 0) + 1
            
            # Try to test the model first
            await self._test_model_health(model_name)
            
            if self._is_model_healthy(model_name):
                logger.info(f"Model {model_name} recovered successfully")
                self.recovery_attempts[model_name] = 0  # Reset counter on success
                return True
            
            # If test failed, try re-downloading
            available_models = await self.ollama_client.list_models()
            if model_name not in available_models:
                logger.info(f"Re-downloading model {model_name}")
                success = await self.ollama_client.pull_model(model_name)
                if success:
                    await self._test_model_health(model_name)
                    if self._is_model_healthy(model_name):
                        logger.info(f"Model {model_name} recovered after re-download")
                        self.recovery_attempts[model_name] = 0
                        return True
            
            return False
            
        except Exception as e:
            logger.error(f"Model recovery failed for {model_name}: {str(e)}")
            return False
    
    async def track_usage(self, model_name: str, operation: str = "generation", tokens: int = 0, latency: float = 0):
        """Track model usage statistics"""
        
        if model_name not in self.usage_stats:
            self.usage_stats[model_name] = UsageStats()
        
        stats = self.usage_stats[model_name]
        stats.total_requests += 1
        stats.total_tokens += tokens
        stats.total_latency += latency
        stats.last_used = datetime.utcnow()
        
        # Update success rate (assume success if no error)
        stats.successful_requests += 1
        
        # Update average tokens per request
        if stats.total_requests > 0:
            stats.average_tokens_per_request = stats.total_tokens / stats.total_requests
        
        # Track operation-specific stats
        if operation not in stats.operations:
            stats.operations[operation] = {"count": 0, "tokens": 0, "latency": 0}
        
        op_stats = stats.operations[operation]
        op_stats["count"] += 1
        op_stats["tokens"] += tokens
        op_stats["latency"] += latency
        
        # Store performance history
        if model_name not in self.performance_history:
            self.performance_history[model_name] = []
        
        history_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "operation": operation,
            "tokens": tokens,
            "latency": latency,
            "success": True
        }
        
        self.performance_history[model_name].append(history_entry)
        
        # Limit history size
        if len(self.performance_history[model_name]) > self.max_history_entries:
            self.performance_history[model_name] = self.performance_history[model_name][-self.max_history_entries:]
    
    async def get_health_report(self) -> Dict[str, Any]:
        """Generate comprehensive health report"""
        
        # Update overall health status
        await self._update_overall_health()
        
        report = {
            "overall_status": self.overall_health_status,
            "last_health_check": self.last_health_check.isoformat() if self.last_health_check else None,
            "models": {},
            "usage_summary": {},
            "system_metrics": await self._get_system_metrics(),
            "recommendations": [],
            "alerts": []
        }
        
        # Model status
        healthy_models = 0
        total_models = len(self.model_statuses)
        
        for model_name, status in self.model_statuses.items():
            is_healthy = self._is_model_healthy(model_name)
            if is_healthy:
                healthy_models += 1
            
            report["models"][model_name] = status.to_dict()
            report["models"][model_name]["healthy"] = is_healthy
        
        # Overall health calculation
        if total_models == 0:
            report["overall_status"] = "critical"
            report["alerts"].append("No models initialized")
        elif healthy_models == 0:
            report["overall_status"] = "critical"
            report["alerts"].append("No healthy models available")
        elif healthy_models < len(ESSENTIAL_MODELS):
            report["overall_status"] = "degraded"
            report["alerts"].append("Some essential models are unhealthy")
        elif healthy_models < total_models:
            report["overall_status"] = "degraded"
            report["alerts"].append("Some optional models are unhealthy")
        else:
            report["overall_status"] = "healthy"
        
        # Usage summary
        for model_name, stats in self.usage_stats.items():
            report["usage_summary"][model_name] = stats.to_dict()
        
        # Generate recommendations
        report["recommendations"] = self._generate_recommendations()
        
        return report
    
    async def _update_overall_health(self):
        """Update overall health status"""
        
        self.last_health_check = datetime.utcnow()
        
        # Count healthy models
        healthy_count = sum(1 for model in self.model_statuses.values() if self._is_model_healthy(model.name))
        total_count = len(self.model_statuses)
        essential_healthy = sum(1 for model in ESSENTIAL_MODELS if self._is_model_healthy(model))
        
        if total_count == 0:
            self.overall_health_status = "critical"
        elif essential_healthy == 0:
            self.overall_health_status = "critical"
        elif essential_healthy < len(ESSENTIAL_MODELS):
            self.overall_health_status = "degraded"
        elif healthy_count < total_count * 0.8:  # 80% threshold
            self.overall_health_status = "degraded"
        else:
            self.overall_health_status = "healthy"
    
    async def _get_system_metrics(self) -> Dict[str, Any]:
        """Get system performance metrics"""
        
        try:
            import psutil
            
            # Memory usage
            memory = psutil.virtual_memory()
            
            # Disk usage
            disk = psutil.disk_usage('/')
            
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            
            return {
                "memory": {
                    "total_gb": round(memory.total / (1024**3), 2),
                    "available_gb": round(memory.available / (1024**3), 2),
                    "used_percent": memory.percent
                },
                "disk": {
                    "total_gb": round(disk.total / (1024**3), 2),
                    "free_gb": round(disk.free / (1024**3), 2),
                    "used_percent": round((disk.used / disk.total) * 100, 1)
                },
                "cpu": {
                    "usage_percent": cpu_percent,
                    "cores": psutil.cpu_count()
                },
                "ollama_connection": await self.ollama_client.health_check()
            }
            
        except ImportError:
            return {"error": "psutil not available for system metrics"}
        except Exception as e:
            return {"error": f"Failed to get system metrics: {str(e)}"}
    
    def _generate_recommendations(self) -> List[Dict[str, Any]]:
        """Generate health and performance recommendations"""
        
        recommendations = []
        
        # Check for failed models
        failed_models = [name for name, status in self.model_statuses.items() if status.status == "failed"]
        if failed_models:
            recommendations.append({
                "type": "error",
                "title": "Failed Models Detected",
                "description": f"Models need attention: {', '.join(failed_models)}",
                "action": "Check logs and attempt model recovery"
            })
        
        # Check for slow models
        slow_models = [name for name, status in self.model_statuses.items() if status.test_latency > 5.0]
        if slow_models:
            recommendations.append({
                "type": "performance",
                "title": "Slow Model Performance",
                "description": f"Models with high latency: {', '.join(slow_models)}",
                "action": "Consider model optimization or hardware upgrade"
            })
        
        # Check download queue
        if self.download_queue:
            recommendations.append({
                "type": "info",
                "title": "Pending Downloads",
                "description": f"{len(self.download_queue)} models queued for download",
                "action": "Monitor download progress"
            })
        
        # Check usage patterns
        unused_models = [name for name, stats in self.usage_stats.items() if stats.total_requests == 0]
        if len(unused_models) > 3:
            recommendations.append({
                "type": "optimization",
                "title": "Unused Models",
                "description": f"{len(unused_models)} models have not been used",
                "action": "Consider removing unused models to save space"
            })
        
        return recommendations
    
    async def _background_monitoring(self):
        """Background task for continuous health monitoring"""
        
        while True:
            try:
                await asyncio.sleep(self.health_check_interval)
                
                # Periodic health checks
                logger.debug("Running periodic health checks")
                
                # Test a subset of models each cycle
                available_models = list(self.model_statuses.keys())
                if available_models:
                    # Test 1/3 of models each cycle
                    batch_size = max(1, len(available_models) // 3)
                    models_to_test = available_models[:batch_size]
                    
                    for model in models_to_test:
                        if self.model_statuses[model].status == "available":
                            await self._test_model_health(model)
                
                # Auto-recovery for failed models
                if self.auto_recovery_enabled:
                    failed_models = [name for name, status in self.model_statuses.items() if status.status == "failed"]
                    for model in failed_models[:2]:  # Limit recovery attempts
                        await self._attempt_model_recovery(model)
                
                # Update overall health
                await self._update_overall_health()
                
            except Exception as e:
                logger.error(f"Background monitoring error: {str(e)}")
    
    async def force_model_download(self, model_name: str) -> bool:
        """Force download of a specific model"""
        
        try:
            logger.info(f"Force downloading model: {model_name}")
            
            # Add model status if not exists
            if model_name not in self.model_statuses:
                specs = get_model_specs(model_name)
                self.model_statuses[model_name] = ModelStatus(
                    name=model_name,
                    status="downloading",
                    size_gb=specs.get("size_gb", 0.0)
                )
                self.usage_stats[model_name] = UsageStats()
            
            # Download the model
            success = await self.ollama_client.pull_model(model_name)
            
            if success:
                await self._test_model_health(model_name)
                return self._is_model_healthy(model_name)
            
            return False
            
        except Exception as e:
            logger.error(f"Force download failed for {model_name}: {str(e)}")
            self._handle_model_error(model_name, str(e))
            return False
    
    async def remove_model(self, model_name: str) -> bool:
        """Remove a model and clean up tracking"""
        
        try:
            # Remove from Ollama
            success = await self.ollama_client.delete_model(model_name)
            
            if success:
                # Clean up tracking
                self.model_statuses.pop(model_name, None)
                self.usage_stats.pop(model_name, None)
                self.performance_history.pop(model_name, None)
                self.recovery_attempts.pop(model_name, None)
                
                logger.info(f"Model {model_name} removed successfully")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to remove model {model_name}: {str(e)}")
            return False
    
    def get_model_performance_history(self, model_name: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get performance history for a model"""
        
        history = self.performance_history.get(model_name, [])
        return history[-limit:] if limit else history
    
    async def optimize_model_selection(self) -> Dict[str, str]:
        """Optimize model selection based on performance data"""
        
        optimized_config = {}
        
        for category, config in self.models_config.items():
            candidates = [config["primary"], config["fallback"]]
            
            # Score candidates based on performance
            best_model = None
            best_score = 0
            
            for model in candidates:
                resolved_model = resolve_model_alias(model)
                status = self.model_statuses.get(resolved_model)
                
                if status and self._is_model_healthy(resolved_model):
                    score = status.performance_score
                    
                    # Bonus for recent usage
                    stats = self.usage_stats.get(resolved_model, UsageStats())
                    if stats.last_used:
                        days_since_use = (datetime.utcnow() - stats.last_used).days
                        if days_since_use < 7:
                            score += 10
                    
                    if score > best_score:
                        best_score = score
                        best_model = resolved_model
            
            optimized_config[category] = best_model or config["primary"]
        
        return optimized_config
