"""
AI Engine Configuration
Centralized configuration management for the AI Engine service
"""

import os
from typing import List, Optional
from pydantic import Field
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # Server Configuration
    HOST: str = Field(default="0.0.0.0", env="HOST")
    PORT: int = Field(default=3002, env="PORT")
    ENVIRONMENT: str = Field(default="development", env="ENVIRONMENT")
    DEBUG: bool = Field(default=False, env="DEBUG")
      # Ollama Configuration
    OLLAMA_BASE_URL: str = Field(default="http://localhost:11434", env="OLLAMA_BASE_URL")
    OLLAMA_HOST: str = Field(default="http://localhost:11434", env="OLLAMA_HOST")
    OLLAMA_TIMEOUT: int = Field(default=900, env="OLLAMA_TIMEOUT")  # Increased from 300 to 900 seconds (15 minutes)
    OLLAMA_MAX_RETRIES: int = Field(default=3, env="OLLAMA_MAX_RETRIES")
    
    # Model Configuration
    DEFAULT_MODEL: str = Field(default="llama3.1:8b", env="DEFAULT_MODEL")
    CONTENT_MODEL: str = Field(default="llama3.1:8b", env="CONTENT_MODEL")
    SEO_MODEL: str = Field(default="llama3.1:8b", env="SEO_MODEL")
    STRUCTURE_MODEL: str = Field(default="llama3.1:8b", env="STRUCTURE_MODEL")
    
    # Generation Configuration
    MAX_TOKENS: int = Field(default=4000, env="MAX_TOKENS")
    TEMPERATURE: float = Field(default=0.7, env="TEMPERATURE")
    TOP_P: float = Field(default=0.9, env="TOP_P")
    
    # Service URLs for inter-service communication
    BACKEND_URL: str = Field(default="http://localhost:3001", env="BACKEND_URL")
    FRONTEND_URL: str = Field(default="http://localhost:3000", env="FRONTEND_URL")
    HUGO_GENERATOR_URL: str = Field(default="http://localhost:3003", env="HUGO_GENERATOR_URL")
      # Workflow Configuration
    MAX_CONCURRENT_WORKFLOWS: int = Field(default=5, env="MAX_CONCURRENT_WORKFLOWS")
    WORKFLOW_TIMEOUT: int = Field(default=1200, env="WORKFLOW_TIMEOUT")  # Increased from 600 to 1200 seconds (20 minutes)
    ENABLE_BACKGROUND_TASKS: bool = Field(default=True, env="ENABLE_BACKGROUND_TASKS")
    
    # Health Check Configuration
    HEALTH_CHECK_INTERVAL: int = Field(default=30, env="HEALTH_CHECK_INTERVAL")
    MODEL_HEALTH_CHECK_INTERVAL: int = Field(default=300, env="MODEL_HEALTH_CHECK_INTERVAL")
    
    # Logging Configuration
    LOG_LEVEL: str = Field(default="INFO", env="LOG_LEVEL")
    LOG_FORMAT: str = Field(default="json", env="LOG_FORMAT")
      # Performance Configuration
    REQUEST_TIMEOUT: int = Field(default=900, env="REQUEST_TIMEOUT")  # Increased from 300 to 900 seconds (15 minutes)
    MAX_REQUEST_SIZE: int = Field(default=10485760, env="MAX_REQUEST_SIZE")
    
    # Security Configuration - Fixed to handle comma-separated string
    ALLOWED_ORIGINS: str = Field(
        default="http://localhost:3000,http://localhost:3001,http://localhost:3003", 
        env="ALLOWED_ORIGINS"
    )
    API_KEY: Optional[str] = Field(default=None, env="AI_ENGINE_API_KEY")
    
    # Database Configuration (if needed for caching/state)
    REDIS_URL: Optional[str] = Field(default=None, env="REDIS_URL")
    DATABASE_URL: Optional[str] = Field(default=None, env="DATABASE_URL")
    
    # File Storage Configuration
    STORAGE_PATH: str = Field(default="./data", env="STORAGE_PATH")
    TEMP_PATH: str = Field(default="./temp", env="TEMP_PATH")
    
    # Rate Limiting Configuration
    RATE_LIMIT_ENABLED: bool = Field(default=True, env="RATE_LIMIT_ENABLED")
    RATE_LIMIT_REQUESTS: int = Field(default=60, env="RATE_LIMIT_REQUESTS")
    RATE_LIMIT_WINDOW: int = Field(default=60, env="RATE_LIMIT_WINDOW")
    
    # Monitoring Configuration
    ENABLE_METRICS: bool = Field(default=True, env="ENABLE_METRICS")
    METRICS_PORT: int = Field(default=9090, env="METRICS_PORT")
      # Development and Production Configuration
    DOCKER_ENV: bool = Field(default=False, env="DOCKER_ENV")
    RELOAD: bool = Field(default=False, env="RELOAD")
    VERBOSE_LOGGING: bool = Field(default=False, env="VERBOSE_LOGGING")
    WORKERS: int = Field(default=1, env="WORKERS")
    ACCESS_LOG: bool = Field(default=True, env="ACCESS_LOG")
      # SSL Configuration
    SSL_KEYFILE: Optional[str] = Field(default=None, env="SSL_KEYFILE")
    SSL_CERTFILE: Optional[str] = Field(default=None, env="SSL_CERTFILE")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"  # Allow extra fields to be ignored
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Ensure OLLAMA_BASE_URL is set from OLLAMA_HOST if provided
        if self.OLLAMA_HOST and not self.OLLAMA_BASE_URL:
            self.OLLAMA_BASE_URL = self.OLLAMA_HOST
    
    @property
    def is_development(self) -> bool:
        """Check if running in development mode"""
        return self.ENVIRONMENT.lower() == "development"
    
    @property
    def is_production(self) -> bool:
        """Check if running in production mode"""
        return self.ENVIRONMENT.lower() == "production"
    
    def get_cors_origins(self) -> List[str]:
        """Get CORS origins with Docker support"""
        # Parse comma-separated string into list
        origins = [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]
        
        # Add Docker service names if in Docker environment
        if os.getenv("DOCKER_ENV"):
            origins.extend([
                "http://frontend:3000",
                "http://backend:3001",
                "http://hugo-generator:3003"
            ])
        
        return origins

# Create global settings instance
settings = Settings()

# Service health check configuration
HEALTH_CHECK_CONFIG = {
    "interval": settings.HEALTH_CHECK_INTERVAL,
    "timeout": 10,
    "retries": 3,
    "endpoints": {
        "ollama": f"{settings.OLLAMA_BASE_URL}/api/tags",
        "backend": f"{settings.BACKEND_URL}/health",
        "hugo_generator": f"{settings.HUGO_GENERATOR_URL}/health"
    }
}

# Model configuration presets
MODEL_PRESETS = {
    "content_generation": {
        "model": settings.CONTENT_MODEL,
        "temperature": 0.7,
        "max_tokens": 2000,
        "top_p": 0.9
    },
    "seo_optimization": {
        "model": settings.SEO_MODEL,
        "temperature": 0.3,
        "max_tokens": 1000,
        "top_p": 0.8
    },
    "structure_planning": {
        "model": settings.STRUCTURE_MODEL,
        "temperature": 0.5,
        "max_tokens": 1500,
        "top_p": 0.9
    }
}

# API Response templates
API_RESPONSES = {
    "success": {
        "success": True,
        "timestamp": None,  # Will be set at runtime
        "request_id": None  # Will be set at runtime
    },
    "error": {
        "success": False,
        "timestamp": None,  # Will be set at runtime
        "request_id": None  # Will be set at runtime
    }
}
