"""
Logging Configuration
Sets up structured logging for the AI Engine service
"""

import logging
import sys
from typing import Any, Dict
import structlog
from src.config import settings

def setup_logging():
    """Configure structured logging for the application"""
    
    # Configure standard library logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    )
    
    # Configure structlog processors
    processors = [
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
    ]
    
    # Add appropriate renderer based on format setting
    if settings.LOG_FORMAT.lower() == "json":
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(structlog.dev.ConsoleRenderer(colors=True))
    
    # Configure structlog
    structlog.configure(
        processors=processors,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
    
    # Set log levels for third-party libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)
    
    if settings.is_development:
        logging.getLogger("uvicorn").setLevel(logging.DEBUG)
    else:
        logging.getLogger("uvicorn").setLevel(logging.INFO)

class LoggingMixin:
    """Mixin class to add logging capabilities to any class"""
    
    @property
    def logger(self):
        """Get logger instance for this class"""
        return structlog.get_logger(self.__class__.__name__)

def log_function_call(func_name: str, **kwargs):
    """Decorator to log function calls"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            logger = structlog.get_logger()
            logger.debug(f"Calling {func_name}", **kwargs)
            try:
                result = func(*args, **kwargs)
                logger.debug(f"Completed {func_name}")
                return result
            except Exception as e:
                logger.error(f"Error in {func_name}", error=str(e))
                raise
        return wrapper
    return decorator

def log_async_function_call(func_name: str, **log_kwargs):
    """Decorator to log async function calls"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            logger = structlog.get_logger()
            logger.debug(f"Calling {func_name}", **log_kwargs)
            try:
                result = await func(*args, **kwargs)
                logger.debug(f"Completed {func_name}")
                return result
            except Exception as e:
                logger.error(f"Error in {func_name}", error=str(e))
                raise
        return wrapper
    return decorator

def create_request_logger(request_id: str) -> structlog.BoundLogger:
    """Create a logger bound to a specific request"""
    return structlog.get_logger().bind(request_id=request_id)

def log_service_health(service_name: str, status: str, **details):
    """Log service health status"""
    logger = structlog.get_logger("health")
    logger.info(
        "Service health check",
        service=service_name,
        status=status,
        **details
    )

def log_model_operation(operation: str, model_name: str, **details):
    """Log model operations"""
    logger = structlog.get_logger("model")
    logger.info(
        f"Model {operation}",
        model=model_name,
        operation=operation,
        **details
    )

def log_generation_metrics(generation_id: str, metrics: Dict[str, Any]):
    """Log content generation metrics"""
    logger = structlog.get_logger("metrics")
    logger.info(
        "Generation metrics",
        generation_id=generation_id,
        **metrics
    )

# Performance monitoring
class PerformanceLogger:
    """Performance monitoring and logging"""
    
    def __init__(self, operation_name: str):
        self.operation_name = operation_name
        self.logger = structlog.get_logger("performance")
        self.start_time = None
    
    def __enter__(self):
        import time
        self.start_time = time.time()
        self.logger.debug(f"Starting {self.operation_name}")
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        import time
        duration = time.time() - self.start_time
        
        if exc_type:
            self.logger.error(
                f"Failed {self.operation_name}",
                duration=f"{duration:.3f}s",
                error=str(exc_val)
            )
        else:
            self.logger.info(
                f"Completed {self.operation_name}",
                duration=f"{duration:.3f}s"
            )

# Async performance monitoring
class AsyncPerformanceLogger:
    """Async performance monitoring and logging"""
    
    def __init__(self, operation_name: str):
        self.operation_name = operation_name
        self.logger = structlog.get_logger("performance")
        self.start_time = None
    
    async def __aenter__(self):
        import time
        self.start_time = time.time()
        self.logger.debug(f"Starting async {self.operation_name}")
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        import time
        duration = time.time() - self.start_time
        
        if exc_type:
            self.logger.error(
                f"Failed async {self.operation_name}",
                duration=f"{duration:.3f}s",
                error=str(exc_val)
            )
        else:
            self.logger.info(
                f"Completed async {self.operation_name}",
                duration=f"{duration:.3f}s"
            )