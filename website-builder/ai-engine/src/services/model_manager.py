"""
Model Manager Service
Manages AI models, their availability, and optimal selection for different tasks
"""

import asyncio
import time
from typing import Dict, Any, List, Optional, Set
from datetime import datetime, timedelta
from dataclasses import dataclass
import structlog

from .ollama_client import OllamaClient
from src.config import settings, MODEL_PRESETS

logger = structlog.get_logger()

@dataclass
class ModelInfo:
    """Model information and metadata"""
    name: str
    size: str
    family: str
    parameter_size: str
    quantization: str
    available: bool
    last_used: Optional[datetime] = None
    use_count: int = 0
    avg_response_time: float = 0.0
    capabilities: List[str] = None
    
    def __post_init__(self):
        if self.capabilities is None:
            self.capabilities = []

@dataclass
class ModelPerformance:
    """Model performance metrics"""
    response_times: List[float]
    success_rate: float
    error_count: int
    last_updated: datetime

class ModelManager:
    """Manages AI models and their selection for optimal performance"""
    
    def __init__(self, ollama_client: OllamaClient):
        """Initialize model manager"""
        self.ollama_client = ollama_client
        self.models: Dict[str, ModelInfo] = {}
        self.performance_metrics: Dict[str, ModelPerformance] = {}
        self.preferred_models: Dict[str, str] = {}
        self.model_loading_cache: Set[str] = set()
        self._last_refresh: Optional[datetime] = None
        
        # Initialize preferred models from settings
        self.preferred_models = {
            "content_generation": settings.CONTENT_MODEL,
            "seo_optimization": settings.SEO_MODEL,
            "structure_planning": settings.STRUCTURE_MODEL,
            "general": settings.DEFAULT_MODEL
        }
        
        logger.info("Model manager initialized")
    
    async def initialize(self):
        """Initialize model manager and refresh model list"""
        await self.refresh_models()
        await self.validate_preferred_models()
        logger.info("Model manager initialization complete")
    
    async def refresh_models(self, force: bool = False) -> None:
        """Refresh available models from Ollama"""
        
        # Skip if recently refreshed (unless forced)
        if not force and self._last_refresh:
            if datetime.now() - self._last_refresh < timedelta(minutes=5):
                return
        
        try:
            logger.info("Refreshing model list from Ollama")
            
            models_data = await self.ollama_client.get_available_models(force_refresh=True)
            
            # Update model information
            available_model_names = set()
            
            for model_data in models_data:
                model_name = model_data.get('name', '')
                if not model_name:
                    continue
                
                available_model_names.add(model_name)
                
                # Parse model information
                model_info = self._parse_model_info(model_data)
                
                # Update or create model info
                if model_name in self.models:
                    self.models[model_name].available = True
                    self.models[model_name].size = model_info.size
                    self.models[model_name].parameter_size = model_info.parameter_size
                else:
                    self.models[model_name] = model_info
            
            # Mark unavailable models
            for model_name in self.models:
                if model_name not in available_model_names:
                    self.models[model_name].available = False
            
            self._last_refresh = datetime.now()
            
            logger.info(
                f"Model refresh complete: {len(available_model_names)} available models",
                available_models=list(available_model_names)
            )
            
        except Exception as e:
            logger.error(f"Failed to refresh models: {e}")
            raise
    
    def _parse_model_info(self, model_data: Dict[str, Any]) -> ModelInfo:
        """Parse model data into ModelInfo object"""
        
        name = model_data.get('name', '')
        size = model_data.get('size', 0)
        
        # Extract model family and details from name
        family = name.split(':')[0] if ':' in name else name
        
        # Estimate parameter size from model name
        parameter_size = self._estimate_parameter_size(name)
        
        # Determine quantization from name
        quantization = self._determine_quantization(name)
        
        # Assign capabilities based on model family
        capabilities = self._assign_capabilities(family)
        
        return ModelInfo(
            name=name,
            size=self._format_size(size),
            family=family,
            parameter_size=parameter_size,
            quantization=quantization,
            available=True,
            capabilities=capabilities
        )
    
    def _estimate_parameter_size(self, model_name: str) -> str:
        """Estimate parameter size from model name"""
        name_lower = model_name.lower()
        
        if '70b' in name_lower:
            return '70B'
        elif '30b' in name_lower:
            return '30B'
        elif '13b' in name_lower:
            return '13B'
        elif '8b' in name_lower:
            return '8B'
        elif '7b' in name_lower:
            return '7B'
        elif '3b' in name_lower:
            return '3B'
        elif '1b' in name_lower:
            return '1B'
        else:
            return 'Unknown'
    
    def _determine_quantization(self, model_name: str) -> str:
        """Determine quantization from model name"""
        name_lower = model_name.lower()
        
        if 'q8' in name_lower:
            return 'Q8'
        elif 'q6' in name_lower:
            return 'Q6'
        elif 'q5' in name_lower:
            return 'Q5'
        elif 'q4' in name_lower:
            return 'Q4'
        elif 'q2' in name_lower:
            return 'Q2'
        elif 'fp16' in name_lower:
            return 'FP16'
        elif 'fp32' in name_lower:
            return 'FP32'
        else:
            return 'Unknown'
    
    def _assign_capabilities(self, family: str) -> List[str]:
        """Assign capabilities based on model family"""
        
        capabilities_map = {
            'llama': ['content_generation', 'conversation', 'analysis'],
            'llama3': ['content_generation', 'conversation', 'analysis', 'reasoning'],
            'mistral': ['content_generation', 'conversation', 'fast_inference'],
            'codellama': ['code_generation', 'code_analysis', 'programming'],
            'deepseek-coder': ['code_generation', 'code_analysis', 'programming'],
            'gemma': ['content_generation', 'conversation'],
            'qwen': ['content_generation', 'conversation', 'multilingual'],
            'phi': ['reasoning', 'analysis', 'fast_inference']
        }
        
        family_lower = family.lower()
        for key, caps in capabilities_map.items():
            if key in family_lower:
                return caps
        
        return ['content_generation']  # Default capability
    
    def _format_size(self, size_bytes: int) -> str:
        """Format model size in human readable format"""
        if size_bytes == 0:
            return "Unknown"
        
        # Convert to appropriate unit
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        
        return f"{size_bytes:.1f} TB"
    
    async def get_available_models(self) -> List[ModelInfo]:
        """Get list of available models"""
        await self.refresh_models()
        return [model for model in self.models.values() if model.available]
    
    async def get_model_for_task(self, task: str) -> str:
        """Get the best model for a specific task"""
        
        # Get preferred model for task
        preferred = self.preferred_models.get(task, settings.DEFAULT_MODEL)
        
        # Check if preferred model is available
        if preferred in self.models and self.models[preferred].available:
            return preferred
        
        # Find alternative model with required capability
        available_models = await self.get_available_models()
        
        for model in available_models:
            if task in model.capabilities:
                logger.info(f"Using alternative model {model.name} for task {task}")
                return model.name
        
        # Fallback to any available model
        if available_models:
            fallback = available_models[0].name
            logger.warning(f"Using fallback model {fallback} for task {task}")
            return fallback
        
        raise RuntimeError(f"No available models for task: {task}")
    
    async def ensure_model_available(self, model_name: str) -> bool:
        """Ensure a model is available, download if necessary"""
        
        # Avoid concurrent downloads of the same model
        if model_name in self.model_loading_cache:
            # Wait for ongoing download
            while model_name in self.model_loading_cache:
                await asyncio.sleep(1)
            return model_name in self.models and self.models[model_name].available
        
        # Check if model is already available
        if model_name in self.models and self.models[model_name].available:
            return True
        
        # Attempt to download model
        try:
            logger.info(f"Downloading model: {model_name}")
            self.model_loading_cache.add(model_name)
            
            success = await self.ollama_client.pull_model(model_name)
            
            if success:
                await self.refresh_models(force=True)
                logger.info(f"Successfully downloaded model: {model_name}")
                return True
            else:
                logger.error(f"Failed to download model: {model_name}")
                return False
                
        except Exception as e:
            logger.error(f"Error downloading model {model_name}: {e}")
            return False
        finally:
            self.model_loading_cache.discard(model_name)
    
    async def validate_preferred_models(self) -> None:
        """Validate that preferred models are available"""
        
        for task, model_name in self.preferred_models.items():
            if not await self.ensure_model_available(model_name):
                logger.warning(f"Preferred model {model_name} for {task} is not available")
                
                # Try to find alternative
                try:
                    alternative = await self.get_model_for_task(task)
                    logger.info(f"Using alternative model {alternative} for {task}")
                except RuntimeError:
                    logger.error(f"No suitable model found for task: {task}")
    
    def record_model_usage(self, model_name: str, response_time: float, success: bool) -> None:
        """Record model usage metrics"""
        
        if model_name not in self.models:
            return
        
        model = self.models[model_name]
        model.last_used = datetime.now()
        model.use_count += 1
        
        # Update average response time
        if model.avg_response_time == 0:
            model.avg_response_time = response_time
        else:
            model.avg_response_time = (model.avg_response_time + response_time) / 2
        
        # Update performance metrics
        if model_name not in self.performance_metrics:
            self.performance_metrics[model_name] = ModelPerformance(
                response_times=[],
                success_rate=1.0 if success else 0.0,
                error_count=0 if success else 1,
                last_updated=datetime.now()
            )
        
        perf = self.performance_metrics[model_name]
        perf.response_times.append(response_time)
        
        # Keep only last 100 response times
        if len(perf.response_times) > 100:
            perf.response_times = perf.response_times[-100:]
        
        if not success:
            perf.error_count += 1
        
        # Recalculate success rate
        total_requests = len(perf.response_times)
        perf.success_rate = 1.0 - (perf.error_count / total_requests)
        perf.last_updated = datetime.now()
    
    def get_model_statistics(self) -> Dict[str, Any]:
        """Get comprehensive model statistics"""
        
        available_count = sum(1 for model in self.models.values() if model.available)
        total_usage = sum(model.use_count for model in self.models.values())
        
        model_stats = []
        for model in self.models.values():
            stats = {
                "name": model.name,
                "family": model.family,
                "size": model.size,
                "parameter_size": model.parameter_size,
                "available": model.available,
                "use_count": model.use_count,
                "avg_response_time": model.avg_response_time,
                "capabilities": model.capabilities,
                "last_used": model.last_used.isoformat() if model.last_used else None
            }
            
            if model.name in self.performance_metrics:
                perf = self.performance_metrics[model.name]
                stats.update({
                    "success_rate": perf.success_rate,
                    "error_count": perf.error_count,
                    "avg_response_time_recent": sum(perf.response_times) / len(perf.response_times) if perf.response_times else 0
                })
            
            model_stats.append(stats)
        
        return {
            "total_models": len(self.models),
            "available_models": available_count,
            "total_usage": total_usage,
            "preferred_models": self.preferred_models,
            "last_refresh": self._last_refresh.isoformat() if self._last_refresh else None,
            "models": model_stats
        }