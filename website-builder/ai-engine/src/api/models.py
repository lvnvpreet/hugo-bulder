"""
Models Management API Endpoints
Handles AI model discovery, management, and optimization
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime
import structlog

from ..services.ollama_client import OllamaClient
from ..services.model_manager import ModelManager
from ..config import settings

logger = structlog.get_logger()
router = APIRouter()

# Response Models
class ModelInfoResponse(BaseModel):
    """Model information response"""
    name: str = Field(..., description="Model name")
    family: str = Field(..., description="Model family")
    size: str = Field(..., description="Model size")
    parameter_size: str = Field(..., description="Parameter count")
    quantization: str = Field(..., description="Quantization method")
    available: bool = Field(..., description="Model availability")
    capabilities: List[str] = Field(..., description="Model capabilities")
    use_count: int = Field(default=0, description="Usage count")
    avg_response_time: float = Field(default=0.0, description="Average response time")
    last_used: Optional[datetime] = Field(None, description="Last usage timestamp")

class ModelListResponse(BaseModel):
    """Model list response"""
    total_models: int = Field(..., description="Total number of models")
    available_models: int = Field(..., description="Available models count")
    models: List[ModelInfoResponse] = Field(..., description="Model list")
    preferred_models: Dict[str, str] = Field(..., description="Preferred models by task")
    last_refresh: Optional[datetime] = Field(None, description="Last refresh timestamp")

class ModelPerformanceResponse(BaseModel):
    """Model performance metrics response"""
    name: str = Field(..., description="Model name")
    success_rate: float = Field(..., description="Success rate percentage")
    avg_response_time: float = Field(..., description="Average response time")
    error_count: int = Field(..., description="Total error count")
    recent_performance: List[float] = Field(..., description="Recent response times")
    recommendation: str = Field(..., description="Performance recommendation")

class ModelInstallRequest(BaseModel):
    """Model installation request"""
    model_config = {"protected_namespaces": ()}
    
    model_name: str = Field(..., description="Model name to install", min_length=1)
    task_type: Optional[str] = Field(None, description="Task type for this model")

# Dependency injection
async def get_ollama_client() -> OllamaClient:
    from main import app
    return app.state.ollama_client

async def get_model_manager() -> ModelManager:
    from main import app
    return app.state.model_manager

@router.get("/models", response_model=ModelListResponse)
async def list_models(
    model_manager: ModelManager = Depends(get_model_manager),
    refresh: bool = False
):
    """
    List all available AI models with their information and status
    """
    
    try:
        # Refresh models if requested
        if refresh:
            await model_manager.refresh_models(force=True)
        
        # Get model statistics
        stats = model_manager.get_model_statistics()
        
        # Convert model data to response format
        models = []
        for model_data in stats["models"]:
            models.append(ModelInfoResponse(
                name=model_data["name"],
                family=model_data["family"],
                size=model_data["size"],
                parameter_size=model_data["parameter_size"],
                quantization=model_data.get("quantization", "Unknown"),
                available=model_data["available"],
                capabilities=model_data["capabilities"],
                use_count=model_data["use_count"],
                avg_response_time=model_data["avg_response_time"],
                last_used=datetime.fromisoformat(model_data["last_used"]) if model_data["last_used"] else None
            ))
        
        return ModelListResponse(
            total_models=stats["total_models"],
            available_models=stats["available_models"],
            models=models,
            preferred_models=stats["preferred_models"],
            last_refresh=datetime.fromisoformat(stats["last_refresh"]) if stats["last_refresh"] else None
        )
        
    except Exception as e:
        logger.error(f"Failed to list models: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/models/{model_name}")
async def get_model_info(
    model_name: str,
    model_manager: ModelManager = Depends(get_model_manager)
):
    """
    Get detailed information about a specific model
    """
    
    try:
        # Check if model exists
        if model_name not in model_manager.models:
            raise HTTPException(status_code=404, detail=f"Model {model_name} not found")
        
        model = model_manager.models[model_name]
        
        # Get performance metrics if available
        performance_data = None
        if model_name in model_manager.performance_metrics:
            perf = model_manager.performance_metrics[model_name]
            performance_data = {
                "success_rate": perf.success_rate,
                "error_count": perf.error_count,
                "recent_response_times": perf.response_times[-10:],  # Last 10 response times
                "last_updated": perf.last_updated
            }
        
        return {
            "name": model.name,
            "family": model.family,
            "size": model.size,
            "parameter_size": model.parameter_size,
            "quantization": model.quantization,
            "available": model.available,
            "capabilities": model.capabilities,
            "use_count": model.use_count,
            "avg_response_time": model.avg_response_time,
            "last_used": model.last_used,
            "performance": performance_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get model info for {model_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/models/install")
async def install_model(
    request: ModelInstallRequest,
    background_tasks: BackgroundTasks,
    model_manager: ModelManager = Depends(get_model_manager)
):
    """
    Install a new AI model
    """
    
    try:
        model_name = request.model_name
        
        logger.info(f"Installing model: {model_name}")
        
        # Check if model is already available
        if model_name in model_manager.models and model_manager.models[model_name].available:
            return {
                "success": True,
                "message": f"Model {model_name} is already available",
                "model_name": model_name
            }
        
        # Start background installation
        background_tasks.add_task(
            install_model_background,
            model_name,
            request.task_type,
            model_manager
        )
        
        return {
            "success": True,
            "message": f"Model {model_name} installation started",
            "model_name": model_name,
            "status": "installing"
        }
        
    except Exception as e:
        logger.error(f"Failed to install model {request.model_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/models/{model_name}")
async def remove_model(
    model_name: str,
    ollama_client: OllamaClient = Depends(get_ollama_client),
    model_manager: ModelManager = Depends(get_model_manager)
):
    """
    Remove an AI model (not implemented in Ollama, but marks as unavailable)
    """
    
    try:
        if model_name not in model_manager.models:
            raise HTTPException(status_code=404, detail=f"Model {model_name} not found")
        
        # Note: Ollama doesn't have a delete API, so we just mark as unavailable
        # In a real implementation, you might call ollama delete command
        
        model_manager.models[model_name].available = False
        
        logger.info(f"Model {model_name} marked as unavailable")
        
        return {
            "success": True,
            "message": f"Model {model_name} removed from available models",
            "model_name": model_name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to remove model {model_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/models/refresh")
async def refresh_models(
    model_manager: ModelManager = Depends(get_model_manager)
):
    """
    Refresh the list of available models from Ollama
    """
    
    try:
        logger.info("Refreshing model list")
        
        await model_manager.refresh_models(force=True)
        await model_manager.validate_preferred_models()
        
        stats = model_manager.get_model_statistics()
        
        return {
            "success": True,
            "message": "Model list refreshed successfully",
            "total_models": stats["total_models"],
            "available_models": stats["available_models"],
            "timestamp": datetime.utcnow()
        }
        
    except Exception as e:
        logger.error(f"Failed to refresh models: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/models/performance")
async def get_models_performance(
    model_manager: ModelManager = Depends(get_model_manager)
):
    """
    Get performance metrics for all models
    """
    
    try:
        performance_data = []
        
        for model_name, model in model_manager.models.items():
            if not model.available:
                continue
            
            # Get performance metrics
            perf_metrics = model_manager.performance_metrics.get(model_name)
            
            if perf_metrics:
                recommendation = get_performance_recommendation(model, perf_metrics)
                
                performance_data.append(ModelPerformanceResponse(
                    name=model_name,
                    success_rate=perf_metrics.success_rate * 100,  # Convert to percentage
                    avg_response_time=model.avg_response_time,
                    error_count=perf_metrics.error_count,
                    recent_performance=perf_metrics.response_times[-5:],  # Last 5 response times
                    recommendation=recommendation
                ))
            else:
                performance_data.append(ModelPerformanceResponse(
                    name=model_name,
                    success_rate=0.0,
                    avg_response_time=0.0,
                    error_count=0,
                    recent_performance=[],
                    recommendation="No usage data available"
                ))
        
        return {
            "models": performance_data,
            "timestamp": datetime.utcnow(),
            "summary": generate_performance_summary(performance_data)
        }
        
    except Exception as e:
        logger.error(f"Failed to get model performance: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/models/recommend/{task_type}")
async def recommend_model(
    task_type: str,
    model_manager: ModelManager = Depends(get_model_manager)
):
    """
    Get model recommendation for a specific task type
    """
    
    try:
        # Get recommended model for task
        recommended_model = await model_manager.get_model_for_task(task_type)
        
        # Get alternative models
        available_models = await model_manager.get_available_models()
        alternatives = [
            model.name for model in available_models 
            if task_type in model.capabilities and model.name != recommended_model
        ]
        
        # Get model info
        model_info = None
        if recommended_model in model_manager.models:
            model = model_manager.models[recommended_model]
            model_info = {
                "name": model.name,
                "family": model.family,
                "parameter_size": model.parameter_size,
                "avg_response_time": model.avg_response_time,
                "use_count": model.use_count
            }
        
        return {
            "task_type": task_type,
            "recommended_model": recommended_model,
            "model_info": model_info,
            "alternatives": alternatives,
            "reasoning": f"Model {recommended_model} is optimized for {task_type} tasks"
        }
        
    except Exception as e:
        logger.error(f"Failed to recommend model for task {task_type}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/models/preferred")
async def update_preferred_models(
    preferred_models: Dict[str, str],
    model_manager: ModelManager = Depends(get_model_manager)
):
    """
    Update preferred models for different task types
    """
    
    try:
        # Validate that all specified models are available
        available_models = [model.name for model in await model_manager.get_available_models()]
        
        for task, model_name in preferred_models.items():
            if model_name not in available_models:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Model {model_name} is not available for task {task}"
                )
        
        # Update preferred models
        model_manager.preferred_models.update(preferred_models)
        
        logger.info(f"Updated preferred models: {preferred_models}")
        
        return {
            "success": True,
            "message": "Preferred models updated successfully",
            "preferred_models": model_manager.preferred_models
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update preferred models: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Background task for model installation
async def install_model_background(
    model_name: str,
    task_type: Optional[str],
    model_manager: ModelManager
):
    """Background task to install a model"""
    
    try:
        logger.info(f"Background installation of model {model_name} started")
        
        success = await model_manager.ensure_model_available(model_name)
        
        if success:
            logger.info(f"Model {model_name} installed successfully")
            
            # If task type is specified, consider updating preferred models
            if task_type and task_type in model_manager.preferred_models:
                logger.info(f"Model {model_name} is now available for {task_type} tasks")
        else:
            logger.error(f"Failed to install model {model_name}")
            
    except Exception as e:
        logger.error(f"Background installation of {model_name} failed: {e}")

def get_performance_recommendation(model, perf_metrics) -> str:
    """Generate performance recommendation for a model"""
    
    if perf_metrics.success_rate < 0.8:
        return "Poor reliability - consider alternative model"
    elif model.avg_response_time > 30.0:
        return "Slow response times - optimize or use smaller model"
    elif perf_metrics.success_rate > 0.95 and model.avg_response_time < 10.0:
        return "Excellent performance - recommended for production"
    elif perf_metrics.success_rate > 0.9:
        return "Good performance - suitable for most tasks"
    else:
        return "Average performance - monitor closely"

def generate_performance_summary(performance_data: List[ModelPerformanceResponse]) -> Dict[str, Any]:
    """Generate overall performance summary"""
    
    if not performance_data:
        return {"message": "No performance data available"}
    
    total_models = len(performance_data)
    avg_success_rate = sum(model.success_rate for model in performance_data) / total_models
    avg_response_time = sum(model.avg_response_time for model in performance_data) / total_models
    
    best_model = max(performance_data, key=lambda x: x.success_rate)
    fastest_model = min(performance_data, key=lambda x: x.avg_response_time if x.avg_response_time > 0 else float('inf'))
    
    return {
        "total_models": total_models,
        "average_success_rate": f"{avg_success_rate:.1f}%",
        "average_response_time": f"{avg_response_time:.2f}s",
        "best_performing": best_model.name,
        "fastest": fastest_model.name if fastest_model.avg_response_time > 0 else "N/A"
    }