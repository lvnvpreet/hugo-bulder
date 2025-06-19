"""
Health Check API Endpoints
Provides comprehensive health monitoring for the AI Engine service
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List
from datetime import datetime
import time
import psutil
import structlog

from ..services.ollama_client import OllamaClient
from ..services.model_manager import ModelManager
from ..services.service_communication import ServiceCommunication
from ..config import settings

logger = structlog.get_logger()
router = APIRouter()

# Dependency injection functions
async def get_ollama_client() -> OllamaClient:
    """Get Ollama client from app state"""
    from main import app
    return app.state.ollama_client

async def get_model_manager() -> ModelManager:
    """Get model manager from app state"""
    from main import app
    return app.state.model_manager

async def get_service_communication() -> ServiceCommunication:
    """Get service communication from app state"""
    from main import app
    return app.state.service_communication

@router.get("/health")
async def health_check(
    ollama_client: OllamaClient = Depends(get_ollama_client),
    model_manager: ModelManager = Depends(get_model_manager),
    service_comm: ServiceCommunication = Depends(get_service_communication)
):
    """
    Comprehensive health check endpoint
    Returns detailed status of all service components
    """
    
    start_time = time.time()
    
    try:
        # Check Ollama service
        ollama_healthy = await ollama_client.health_check()
        
        # Get model information
        available_models = await model_manager.get_available_models()
        model_count = len(available_models)
        
        # Check service connectivity
        service_connectivity = await service_comm.validate_service_connectivity()
        
        # Get system metrics
        system_metrics = get_system_metrics()
        
        # Overall health determination
        overall_healthy = (
            ollama_healthy and 
            model_count > 0 and 
            service_connectivity and
            system_metrics["memory_usage"] < 90 and
            system_metrics["disk_usage"] < 90
        )
        
        health_data = {
            "status": "healthy" if overall_healthy else "unhealthy",
            "service": "ai-engine",
            "version": "2.0.0",
            "timestamp": datetime.utcnow().isoformat(),
            "response_time": f"{(time.time() - start_time) * 1000:.2f}ms",
            "checks": {
                "ollama_service": {
                    "status": "healthy" if ollama_healthy else "unhealthy",
                    "url": settings.OLLAMA_BASE_URL
                },
                "models": {
                    "status": "healthy" if model_count > 0 else "unhealthy",
                    "available_count": model_count,
                    "preferred_models": model_manager.preferred_models
                },
                "service_connectivity": {
                    "status": "healthy" if service_connectivity else "degraded",
                    "backend_url": settings.BACKEND_URL,
                    "hugo_generator_url": settings.HUGO_GENERATOR_URL
                },
                "system": {
                    "status": "healthy" if system_metrics["memory_usage"] < 90 else "warning",
                    **system_metrics
                }
            },
            "configuration": {
                "environment": settings.ENVIRONMENT,
                "port": settings.PORT,
                "default_model": settings.DEFAULT_MODEL,
                "max_concurrent_workflows": settings.MAX_CONCURRENT_WORKFLOWS
            }
        }
        
        if overall_healthy:
            return health_data
        else:
            return health_data  # Still return 200 but with unhealthy status
            
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "error",
            "service": "ai-engine",
            "version": "2.0.0",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e)
        }

@router.get("/health/detailed")
async def detailed_health_check(
    ollama_client: OllamaClient = Depends(get_ollama_client),
    model_manager: ModelManager = Depends(get_model_manager),
    service_comm: ServiceCommunication = Depends(get_service_communication)
):
    """
    Detailed health check with comprehensive diagnostics
    """
    
    # Get basic health status
    basic_health = await health_check(ollama_client, model_manager, service_comm)
    
    # Add detailed information
    detailed_info = {
        "ollama_statistics": ollama_client.get_statistics(),
        "model_statistics": model_manager.get_model_statistics(),
        "service_health": await service_comm.check_all_services_health(),
        "performance_metrics": {
            "requests_processed": getattr(ollama_client, '_request_count', 0),
            "errors_encountered": getattr(ollama_client, '_error_count', 0),
            "average_response_time": calculate_average_response_time(model_manager)
        }
    }
    
    # Merge with basic health data
    return {**basic_health, "detailed": detailed_info}

@router.get("/health/models")
async def models_health_check(
    model_manager: ModelManager = Depends(get_model_manager)
):
    """
    Specific health check for model availability and status
    """
    
    try:
        available_models = await model_manager.get_available_models()
        model_stats = model_manager.get_model_statistics()
        
        return {
            "status": "healthy" if available_models else "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "models": {
                "total": model_stats["total_models"],
                "available": model_stats["available_models"],
                "preferred": model_stats["preferred_models"],
                "last_refresh": model_stats["last_refresh"]
            },
            "model_list": [
                {
                    "name": model.name,
                    "family": model.family,
                    "size": model.size,
                    "available": model.available,
                    "capabilities": model.capabilities
                }
                for model in available_models
            ]
        }
        
    except Exception as e:
        logger.error(f"Model health check failed: {e}")
        return {
            "status": "error",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e)
        }

@router.get("/health/services")
async def services_health_check(
    service_comm: ServiceCommunication = Depends(get_service_communication)
):
    """
    Health check for external service connectivity
    """
    
    try:
        service_health = await service_comm.check_all_services_health()
        
        return {
            "status": service_health["overall_status"],
            "timestamp": datetime.utcnow().isoformat(),
            "services": service_health["services"],
            "summary": {
                "overall_status": service_health["overall_status"],
                "healthy_services": service_health["healthy_services"]
            }
        }
        
    except Exception as e:
        logger.error(f"Service health check failed: {e}")
        return {
            "status": "error",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e)
        }

@router.get("/health/system")
async def system_health_check():
    """
    System resource health check
    """
    
    try:
        metrics = get_system_metrics()
        
        status = "healthy"
        if metrics["memory_usage"] > 90 or metrics["disk_usage"] > 90:
            status = "critical"
        elif metrics["memory_usage"] > 80 or metrics["disk_usage"] > 80:
            status = "warning"
        
        return {
            "status": status,
            "timestamp": datetime.utcnow().isoformat(),
            "metrics": metrics,
            "recommendations": get_health_recommendations(metrics)
        }
        
    except Exception as e:
        logger.error(f"System health check failed: {e}")
        return {
            "status": "error",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e)
        }

@router.post("/health/refresh")
async def refresh_health_status(
    model_manager: ModelManager = Depends(get_model_manager)
):
    """
    Force refresh of health status and model list
    """
    
    try:
        # Refresh model list
        await model_manager.refresh_models(force=True)
        
        # Validate preferred models
        await model_manager.validate_preferred_models()
        
        return {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "message": "Health status refreshed successfully"
        }
        
    except Exception as e:
        logger.error(f"Health refresh failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def get_system_metrics() -> Dict[str, Any]:
    """Get current system metrics"""
    
    try:
        # Memory usage
        memory = psutil.virtual_memory()
        memory_usage = memory.percent
        
        # Disk usage
        disk = psutil.disk_usage('/')
        disk_usage = (disk.used / disk.total) * 100
        
        # CPU usage
        cpu_usage = psutil.cpu_percent(interval=1)
        
        # Process info
        process = psutil.Process()
        process_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        return {
            "memory_usage": memory_usage,
            "memory_available": memory.available / 1024 / 1024 / 1024,  # GB
            "disk_usage": disk_usage,
            "disk_free": disk.free / 1024 / 1024 / 1024,  # GB
            "cpu_usage": cpu_usage,
            "process_memory": process_memory,
            "cpu_count": psutil.cpu_count()
        }
        
    except Exception as e:
        logger.warning(f"Failed to get system metrics: {e}")
        return {
            "memory_usage": 0,
            "disk_usage": 0,
            "cpu_usage": 0,
            "error": "Unable to retrieve system metrics"
        }

def calculate_average_response_time(model_manager: ModelManager) -> float:
    """Calculate average response time across all models"""
    
    total_time = 0
    total_count = 0
    
    for model in model_manager.models.values():
        if model.use_count > 0 and model.avg_response_time > 0:
            total_time += model.avg_response_time * model.use_count
            total_count += model.use_count
    
    return total_time / total_count if total_count > 0 else 0

def get_health_recommendations(metrics: Dict[str, Any]) -> List[str]:
    """Get health recommendations based on system metrics"""
    
    recommendations = []
    
    if metrics.get("memory_usage", 0) > 90:
        recommendations.append("Critical: Memory usage is very high. Consider restarting the service or increasing memory allocation.")
    elif metrics.get("memory_usage", 0) > 80:
        recommendations.append("Warning: Memory usage is high. Monitor closely and consider scaling if needed.")
    
    if metrics.get("disk_usage", 0) > 90:
        recommendations.append("Critical: Disk usage is very high. Clean up temporary files or increase disk space.")
    elif metrics.get("disk_usage", 0) > 80:
        recommendations.append("Warning: Disk usage is high. Monitor storage and clean up old files.")
    
    if metrics.get("cpu_usage", 0) > 90:
        recommendations.append("High CPU usage detected. Consider reducing concurrent operations.")
    
    if not recommendations:
        recommendations.append("System is operating within normal parameters.")
    
    return recommendations