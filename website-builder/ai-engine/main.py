"""
AI Engine FastAPI Application
Rebuilt for better communication with other services
"""

from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import time
import uuid
import os
import sys
from datetime import datetime
from typing import Dict, Any, Optional
import structlog
import uvicorn
from dotenv import load_dotenv

# Add src to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.services.ollama_client import OllamaClient
from src.services.model_manager import ModelManager
from src.services.service_communication import ServiceCommunication
from src.middleware.request_middleware import RequestMiddleware
from src.api.health import router as health_router
from src.api.content import router as content_router
from src.api.models import router as models_router
from src.api.generation import router as generation_router
from src.utils.logging_config import setup_logging
from src.config import settings

# Load environment variables
load_dotenv()

# Setup logging
setup_logging()
logger = structlog.get_logger()

# Global service instances
ollama_client: Optional[OllamaClient] = None
model_manager: Optional[ModelManager] = None
service_communication: Optional[ServiceCommunication] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    logger.info("🚀 [DEBUG] ===== AI ENGINE STARTUP =====")
    logger.info("🚀 [DEBUG] Starting AI Engine application")
    logger.info("🚀 [DEBUG] Python version:", version=sys.version)
    logger.info("🚀 [DEBUG] Working directory:", cwd=os.getcwd())
    logger.info("🚀 [DEBUG] Environment variables:", env={
        "OLLAMA_HOST": os.getenv("OLLAMA_HOST", "not set"),
        "MODEL_NAME": os.getenv("MODEL_NAME", "not set"),
        "BACKEND_URL": os.getenv("BACKEND_URL", "not set"),
        "HUGO_GENERATOR_URL": os.getenv("HUGO_GENERATOR_URL", "not set"),
    })
    
    try:
        # Initialize services
        logger.info("🔧 [DEBUG] Initializing Ollama client")
        global ollama_client, model_manager, service_communication
        
        ollama_client = OllamaClient()
        logger.info("✅ [DEBUG] Ollama client initialized")
        
        logger.info("🔧 [DEBUG] Initializing model manager")
        model_manager = ModelManager(ollama_client)
        logger.info("✅ [DEBUG] Model manager initialized")
        
        logger.info("🔧 [DEBUG] Initializing service communication")
        service_communication = ServiceCommunication()
        logger.info("✅ [DEBUG] Service communication initialized")
        
        # Store in app state for dependency injection
        app.state.ollama_client = ollama_client
        app.state.model_manager = model_manager
        app.state.service_communication = service_communication
          # Test connections
        logger.info("🔍 [DEBUG] Testing Ollama connection")
        try:
            await ollama_client.health_check()
            logger.info("✅ [DEBUG] Ollama connection successful")
        except Exception as e:
            logger.error("❌ [DEBUG] Ollama connection failed:", error=str(e))
        
        logger.info("🔍 [DEBUG] Testing backend service communication")
        try:
            health_status = await service_communication.check_backend_health()
            logger.info("✅ [DEBUG] Backend health check:", status=health_status)
        except Exception as e:
            logger.error("❌ [DEBUG] Backend health check failed:", error=str(e))
        
        logger.info("✅ [DEBUG] AI Engine startup completed successfully")
        
        yield
        
    except Exception as e:
        logger.error("❌ [DEBUG] Failed to initialize AI Engine:", error=str(e), exc_info=True)
        raise
    finally:
        logger.info("🔄 [DEBUG] AI Engine shutting down")
        # Cleanup if needed
    
    # Shutdown
    logger.info("🛑 Shutting down AI Engine service...")
    
    try:
        if ollama_client:
            await ollama_client.close()
        if service_communication:
            await service_communication.close()
        logger.info("✅ AI Engine service shutdown complete")
    except Exception as e:
        logger.error(f"❌ Error during shutdown: {e}")

# Create FastAPI application
app = FastAPI(
    title="AI Engine Service",
    description="AI-powered content generation engine for the website builder",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# CORS Middleware - Allow communication with other services
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Frontend
        "http://localhost:3001",  # Backend
        "http://localhost:3003",  # Hugo Generator
        "http://frontend:3000",   # Docker frontend
        "http://backend:3001",    # Docker backend
        "http://hugo-generator:3003",  # Docker hugo-generator
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Trust local hosts
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "ai-engine", "*"]
)

# Custom request middleware
app.add_middleware(RequestMiddleware)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions"""
    request_id = getattr(request.state, 'request_id', 'unknown')
    
    logger.error(
        "Unhandled exception",
        request_id=request_id,
        error=str(exc),
        path=request.url.path,
        method=request.method,
        exc_info=True
    )
    
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "message": "An unexpected error occurred",
            "request_id": request_id,
            "timestamp": datetime.utcnow().isoformat(),
        }
    )

# HTTP exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
    request_id = getattr(request.state, 'request_id', 'unknown')
    
    logger.warning(
        "HTTP exception",
        request_id=request_id,
        status_code=exc.status_code,
        detail=exc.detail,
        path=request.url.path,
        method=request.method,
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.detail,
            "request_id": request_id,
            "timestamp": datetime.utcnow().isoformat(),
        }
    )

# Dependency functions for route injection
async def get_ollama_client() -> OllamaClient:
    """Get Ollama client instance"""
    return app.state.ollama_client

async def get_model_manager() -> ModelManager:
    """Get model manager instance"""
    return app.state.model_manager

async def get_service_communication() -> ServiceCommunication:
    """Get service communication instance"""
    return app.state.service_communication

# Root endpoint with service information
@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "AI Engine",
        "version": "2.0.0",
        "status": "running",
        "port": settings.PORT,
        "timestamp": datetime.utcnow().isoformat(),        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "models": "/api/v1/models",
            "content": "/api/v1/content",
            "generation": "/api/v1/generation"
        },
        "features": [
            "Content generation",
            "Model management",
            "Service communication",
            "Health monitoring"
        ]
    }

# Health check endpoint (compatible with other services)
@app.get("/health")
async def health_check():
    """Service health check endpoint"""
    try:
        # Check Ollama connection
        ollama_healthy = await app.state.ollama_client.health_check()
        
        # Check model availability
        available_models = await app.state.model_manager.get_available_models()
        
        return {
            "status": "healthy" if ollama_healthy else "unhealthy",
            "service": "ai-engine",
            "version": "2.0.0",
            "timestamp": datetime.utcnow().isoformat(),
            "checks": {
                "ollama": "healthy" if ollama_healthy else "unhealthy",
                "models": f"{len(available_models)} available"
            },
            "uptime": time.time() - app.state.start_time if hasattr(app.state, 'start_time') else 0
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "service": "ai-engine",
                "version": "2.0.0",
                "timestamp": datetime.utcnow().isoformat(),
                "error": str(e)
            }
        )

# Include API routers with v1 prefix to match other services
app.include_router(health_router, prefix="/api/v1", tags=["Health"])
app.include_router(models_router, prefix="/api/v1", tags=["Models"])
app.include_router(content_router, prefix="/api/v1", tags=["Content"])
app.include_router(generation_router, prefix="/api/v1", tags=["Generation"])

# Development server
if __name__ == "__main__":
    # Store start time for uptime calculation
    app.state.start_time = time.time()
    
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development",
        log_level="info",
        access_log=True,
        server_header=False,
        date_header=False
    )