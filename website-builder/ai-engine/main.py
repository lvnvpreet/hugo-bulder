"""
AI Engine FastAPI Application
Main entry point for the AI-powered content generation engine
"""

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import time
import uuid
from datetime import datetime
from typing import Dict, Any
import structlog
import uvicorn
import os
from dotenv import load_dotenv

from src.services.ollama_client import OllamaClient
from src.services.model_manager import ModelManager
from src.api.health import router as health_router
from src.api.generation import router as generation_router

# Load environment variables
load_dotenv()

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Global instances
ollama_client: OllamaClient = None
model_manager: ModelManager = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    global ollama_client, model_manager
    
    # Startup
    logger.info("Starting AI Engine...")
    
    try:
        # Initialize Ollama client
        ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")
        ollama_client = OllamaClient(base_url=ollama_base_url)
        
        # Initialize model manager
        model_manager = ModelManager(ollama_client)
        
        # Check Ollama connection
        if await ollama_client.health_check():
            logger.info("Ollama connection established")
            
            # Initialize models in background
            try:
                await model_manager.initialize_models()
                logger.info("Model initialization completed")
            except Exception as e:
                logger.warning(f"Model initialization failed: {str(e)}")
        else:
            logger.warning("Ollama service not available - some features may be limited")
        
        # Store instances in app state
        app.state.ollama_client = ollama_client
        app.state.model_manager = model_manager
        
        logger.info("AI Engine startup completed")
        
    except Exception as e:
        logger.error(f"Startup failed: {str(e)}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down AI Engine...")
    
    if ollama_client:
        await ollama_client.close()
    
    logger.info("AI Engine shutdown completed")

# Create FastAPI application
app = FastAPI(
    title="AI Content Generation Engine",
    description="Advanced AI engine for website content generation using LangGraph and Ollama",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Frontend development
        "http://localhost:3001",  # Backend API
        "http://frontend:3000",   # Docker frontend
        "http://backend:3001",    # Docker backend
        os.getenv("FRONTEND_URL", ""),
        os.getenv("BACKEND_URL", ""),
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Trusted host middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=[
        "localhost",
        "127.0.0.1",
        "0.0.0.0",
        "ai-engine",
        os.getenv("ALLOWED_HOST", ""),
    ]
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all HTTP requests with timing and metadata"""
    
    request_id = str(uuid.uuid4())
    start_time = time.time()
    
    # Add request ID to state
    request.state.request_id = request_id
    
    # Log request
    logger.info(
        "Request started",
        request_id=request_id,
        method=request.method,
        url=str(request.url),
        client_ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    
    try:
        response = await call_next(request)
        
        # Calculate duration
        duration = time.time() - start_time
        
        # Log response
        logger.info(
            "Request completed",
            request_id=request_id,
            status_code=response.status_code,
            duration=round(duration, 3),
        )
        
        return response
        
    except Exception as e:
        duration = time.time() - start_time
        
        logger.error(
            "Request failed",
            request_id=request_id,
            error=str(e),
            duration=round(duration, 3),
        )
        
        raise

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled errors"""
    
    request_id = getattr(request.state, 'request_id', 'unknown')
    
    logger.error(
        "Unhandled exception",
        request_id=request_id,
        error=str(exc),
        error_type=type(exc).__name__,
        path=request.url.path,
        method=request.method,
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            "request_id": request_id,
            "timestamp": datetime.utcnow().isoformat(),
        }
    )

# HTTP exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with proper logging"""
    
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
            "error": exc.detail,
            "request_id": request_id,
            "timestamp": datetime.utcnow().isoformat(),
        }
    )

# Dependency functions
def get_ollama_client() -> OllamaClient:
    """Get Ollama client instance"""
    return app.state.ollama_client

def get_model_manager() -> ModelManager:
    """Get model manager instance"""
    return app.state.model_manager

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "AI Content Generation Engine",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.utcnow().isoformat(),
        "docs_url": "/docs",
        "health_url": "/health",
    }

# Include routers
app.include_router(health_router, prefix="/api/v1")
app.include_router(generation_router, prefix="/api/v1")

# Development server
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "3002")),
        reload=os.getenv("ENVIRONMENT") == "development",
        log_level="info",
        access_log=True,
    )
