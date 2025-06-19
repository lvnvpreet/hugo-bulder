"""
Request Middleware
Handles request preprocessing, logging, and response formatting
"""

import time
import uuid
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import structlog

logger = structlog.get_logger()

class RequestMiddleware(BaseHTTPMiddleware):
    """Middleware for request handling and monitoring"""
    
    def __init__(self, app=None):
        super().__init__(app)
        self.request_count = 0
        self.error_count = 0
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request through middleware pipeline"""
        
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Increment request counter
        self.request_count += 1
        
        # Record start time
        start_time = time.time()
        
        # Extract client information
        client_ip = self._get_client_ip(request)
        user_agent = request.headers.get("user-agent", "Unknown")
        
        # Log incoming request
        logger.info(
            "Incoming request",
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            query_params=str(request.query_params),
            client_ip=client_ip,
            user_agent=user_agent
        )
        
        try:
            # Process request
            response = await call_next(request)
            
            # Calculate processing time
            process_time = time.time() - start_time
            
            # Add custom headers
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Process-Time"] = f"{process_time:.3f}s"
            response.headers["X-Service"] = "ai-engine"
            
            # Log successful response
            logger.info(
                "Request completed",
                request_id=request_id,
                method=request.method,
                path=request.url.path,
                status_code=response.status_code,
                process_time=f"{process_time:.3f}s"
            )
            
            return response
            
        except Exception as e:
            # Increment error counter
            self.error_count += 1
            
            # Calculate processing time
            process_time = time.time() - start_time
            
            # Log error
            logger.error(
                "Request failed",
                request_id=request_id,
                method=request.method,
                path=request.url.path,
                error=str(e),
                process_time=f"{process_time:.3f}s",
                exc_info=True
            )
            
            # Return structured error response
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "error": "Internal server error",
                    "message": "An unexpected error occurred",
                    "request_id": request_id,
                    "timestamp": time.time()
                },
                headers={
                    "X-Request-ID": request_id,
                    "X-Process-Time": f"{process_time:.3f}s",
                    "X-Service": "ai-engine"
                }
            )
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address from request"""
        
        # Check for forwarded headers (when behind reverse proxy)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        # Check for real IP header
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # Fall back to direct client
        return request.client.host if request.client else "unknown"
    
    def get_stats(self) -> dict:
        """Get middleware statistics"""
        
        error_rate = (self.error_count / max(self.request_count, 1)) * 100
        
        return {
            "total_requests": self.request_count,
            "error_count": self.error_count,
            "error_rate": f"{error_rate:.2f}%"
        }