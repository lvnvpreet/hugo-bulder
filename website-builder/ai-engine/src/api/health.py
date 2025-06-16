"""
Health Check API Endpoints
Provides health monitoring and status information for the AI engine
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from datetime import datetime
import psutil
import os

from ..services.ollama_client import OllamaClient
from ..services.model_manager import ModelManager

router = APIRouter(prefix="/health", tags=["health"])

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    uptime_seconds: Optional[float] = None

class DetailedHealthResponse(BaseModel):
    status: str
    timestamp: str
    uptime_seconds: float
    ollama_status: Dict[str, Any]
    models_status: Dict[str, Any]
    system_resources: Dict[str, Any]
    errors: List[str] = []
    warnings: List[str] = []

class ModelListResponse(BaseModel):
    models: List[str]
    total_count: int
    timestamp: str

class ModelPullResponse(BaseModel):
    success: bool
    message: str
    model_name: str
    timestamp: str

# Startup time for uptime calculation
startup_time = datetime.utcnow()

def get_ollama_client() -> OllamaClient:
    """Dependency to get Ollama client from app state"""
    from main import app
    return app.state.ollama_client

def get_model_manager() -> ModelManager:
    """Dependency to get model manager from app state"""
    from main import app
    return app.state.model_manager

@router.get("/", response_model=HealthResponse)
async def basic_health():
    """Basic health check endpoint"""
    
    uptime = (datetime.utcnow() - startup_time).total_seconds()
    
    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow().isoformat(),
        uptime_seconds=uptime
    )

@router.get("/detailed", response_model=DetailedHealthResponse)
async def detailed_health(
    ollama_client: OllamaClient = Depends(get_ollama_client),
    model_manager: ModelManager = Depends(get_model_manager)
):
    """Comprehensive health report"""
    
    uptime = (datetime.utcnow() - startup_time).total_seconds()
    errors = []
    warnings = []
    overall_status = "healthy"
    
    # Check Ollama status
    ollama_status = {"healthy": False, "error": "Not initialized"}
    if ollama_client:
        try:
            ollama_status = await ollama_client.get_status()
            if not ollama_status.get("healthy", False):
                warnings.append("Ollama service is not responding")
                overall_status = "degraded"
        except Exception as e:
            errors.append(f"Ollama status check failed: {str(e)}")
            overall_status = "degraded"
    else:
        errors.append("Ollama client not initialized")
        overall_status = "critical"
    
    # Check model manager status
    models_status = {"healthy": False, "error": "Not initialized"}
    if model_manager:
        try:
            models_status = await model_manager.get_health_report()
            if models_status.get("overall_status") != "healthy":
                if models_status.get("overall_status") == "critical":
                    overall_status = "critical"
                elif overall_status == "healthy":
                    overall_status = "degraded"
                
                # Add model-specific warnings
                for recommendation in models_status.get("recommendations", []):
                    warnings.append(recommendation)
                    
        except Exception as e:
            errors.append(f"Model manager status check failed: {str(e)}")
            overall_status = "critical"
    else:
        errors.append("Model manager not initialized")
        overall_status = "critical"
    
    # Check system resources
    system_resources = {}
    try:
        system_resources = {
            "cpu_percent": psutil.cpu_percent(interval=1),
            "memory_percent": psutil.virtual_memory().percent,
            "memory_available_gb": round(psutil.virtual_memory().available / (1024**3), 2),
            "memory_total_gb": round(psutil.virtual_memory().total / (1024**3), 2),
            "disk_usage_percent": psutil.disk_usage('/').percent,
            "disk_free_gb": round(psutil.disk_usage('/').free / (1024**3), 2),
        }
        
        # Add warnings for resource constraints
        if system_resources["memory_percent"] > 90:
            warnings.append("High memory usage detected")
            if overall_status == "healthy":
                overall_status = "degraded"
        
        if system_resources["disk_usage_percent"] > 90:
            warnings.append("Low disk space available")
            if overall_status == "healthy":
                overall_status = "degraded"
        
        if system_resources["cpu_percent"] > 95:
            warnings.append("High CPU usage detected")
            
    except Exception as e:
        warnings.append(f"Could not retrieve system resources: {str(e)}")
    
    return DetailedHealthResponse(
        status=overall_status,
        timestamp=datetime.utcnow().isoformat(),
        uptime_seconds=uptime,
        ollama_status=ollama_status,
        models_status=models_status,
        system_resources=system_resources,
        errors=errors,
        warnings=warnings
    )

@router.get("/models", response_model=ModelListResponse)
async def list_models(ollama_client: OllamaClient = Depends(get_ollama_client)):
    """List all available models"""
    
    if not ollama_client:
        raise HTTPException(status_code=503, detail="Ollama client not available")
    
    try:
        models = await ollama_client.list_models()
        
        return ModelListResponse(
            models=models,
            total_count=len(models),
            timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list models: {str(e)}")

@router.post("/models/pull/{model_name}", response_model=ModelPullResponse)
async def pull_model(
    model_name: str,
    ollama_client: OllamaClient = Depends(get_ollama_client)
):
    """Download a specific model"""
    
    if not ollama_client:
        raise HTTPException(status_code=503, detail="Ollama client not available")
    
    try:
        # Check if Ollama is healthy first
        if not await ollama_client.health_check():
            raise HTTPException(status_code=503, detail="Ollama service is not available")
        
        success = await ollama_client.pull_model(model_name)
        
        if success:
            return ModelPullResponse(
                success=True,
                message=f"Model {model_name} downloaded successfully",
                model_name=model_name,
                timestamp=datetime.utcnow().isoformat()
            )
        else:
            return ModelPullResponse(
                success=False,
                message=f"Failed to download model {model_name}",
                model_name=model_name,
                timestamp=datetime.utcnow().isoformat()
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model download failed: {str(e)}")

@router.delete("/models/{model_name}")
async def delete_model(
    model_name: str,
    ollama_client: OllamaClient = Depends(get_ollama_client)
):
    """Delete a specific model"""
    
    if not ollama_client:
        raise HTTPException(status_code=503, detail="Ollama client not available")
    
    try:
        success = await ollama_client.delete_model(model_name)
        
        if success:
            return {
                "success": True,
                "message": f"Model {model_name} deleted successfully",
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            raise HTTPException(status_code=500, detail=f"Failed to delete model {model_name}")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model deletion failed: {str(e)}")

@router.get("/models/{model_name}/info")
async def get_model_info(
    model_name: str,
    ollama_client: OllamaClient = Depends(get_ollama_client)
):
    """Get information about a specific model"""
    
    if not ollama_client:
        raise HTTPException(status_code=503, detail="Ollama client not available")
    
    try:
        info = await ollama_client.get_model_info(model_name)
        
        if info:
            return {
                "model_name": model_name,
                "info": info,
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            raise HTTPException(status_code=404, detail=f"Model {model_name} not found")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get model info: {str(e)}")

@router.get("/system")
async def system_info():
    """Get system information and resource usage"""
    
    try:
        # Get system information
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        system_info = {
            "cpu": {
                "cores": psutil.cpu_count(),
                "logical_cores": psutil.cpu_count(logical=True),
                "current_usage_percent": psutil.cpu_percent(interval=1),
            },
            "memory": {
                "total_gb": round(memory.total / (1024**3), 2),
                "available_gb": round(memory.available / (1024**3), 2),
                "used_gb": round(memory.used / (1024**3), 2),
                "usage_percent": memory.percent,
            },
            "disk": {
                "total_gb": round(disk.total / (1024**3), 2),
                "free_gb": round(disk.free / (1024**3), 2),
                "used_gb": round(disk.used / (1024**3), 2),
                "usage_percent": round((disk.used / disk.total) * 100, 1),
            },
            "python": {
                "version": os.sys.version,
                "executable": os.sys.executable,
            },
            "environment": {
                "platform": os.name,
                "environment_vars": {
                    "OLLAMA_BASE_URL": os.getenv("OLLAMA_BASE_URL", "http://ollama:11434"),
                    "PORT": os.getenv("PORT", "3002"),
                    "ENVIRONMENT": os.getenv("ENVIRONMENT", "development"),
                }
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return system_info
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get system info: {str(e)}")

@router.post("/initialize")
async def initialize_models(
    model_manager: ModelManager = Depends(get_model_manager)
):
    """Initialize/reinitialize models"""
    
    if not model_manager:
        raise HTTPException(status_code=503, detail="Model manager not available")
    
    try:
        await model_manager.initialize_models()
        
        return {
            "success": True,
            "message": "Model initialization completed",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model initialization failed: {str(e)}")

@router.get("/test-connection")
async def test_ollama_connection(
    ollama_client: OllamaClient = Depends(get_ollama_client)
):
    """Test Ollama connection with detailed diagnostics"""
    
    if not ollama_client:
        return {
            "error": "Ollama client not initialized",
            "suggestions": [
                "Check if AI engine started properly",
                "Verify OLLAMA_HOST environment variable"
            ]
        }
    
    try:
        # Run connection test
        connection_test = await ollama_client.test_connection()
        
        # Add environment info
        connection_test["environment"] = {
            "OLLAMA_HOST": os.getenv("OLLAMA_HOST", "not set"),
            "OLLAMA_BASE_URL": os.getenv("OLLAMA_BASE_URL", "not set"),
            "configured_url": ollama_client.base_url
        }
        
        # Add suggestions based on results
        if not connection_test["connected"]:
            connection_test["suggestions"] = [
                "Check if Ollama is running: 'ollama serve'",
                "Verify the URL is correct",
                "Check firewall settings",
                "Ensure Ollama is listening on the correct port"
            ]
        
        return connection_test
        
    except Exception as e:
        return {
            "error": str(e),
            "base_url": ollama_client.base_url,
            "suggestions": [
                "Check if Ollama service is running",
                "Verify network connectivity",
                "Check environment variables"
            ]
        }
