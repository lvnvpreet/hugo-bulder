"""
Service Communication Module
Handles communication with other services in the microservices architecture
"""

import httpx
import asyncio
import json
import time
from typing import Dict, Any, Optional, List
from datetime import datetime
import structlog
from src.config import settings

logger = structlog.get_logger()

class ServiceCommunication:
    """Handles HTTP communication with other services"""
    
    def __init__(self):
        """Initialize service communication with proper configuration"""
        self.backend_url = settings.BACKEND_URL.rstrip('/')
        self.hugo_generator_url = settings.HUGO_GENERATOR_URL.rstrip('/')
        self.frontend_url = settings.FRONTEND_URL.rstrip('/')
        
        # Create HTTP client with proper timeout and retries
        self.client = httpx.AsyncClient(            timeout=httpx.Timeout(
                connect=10.0,
                read=1200.0,  # 20 minutes for long-running operations (increased from 5 minutes)
                write=30.0,
                pool=10.0
            ),
            limits=httpx.Limits(
                max_connections=20,
                max_keepalive_connections=5
            ),
            headers={
                "Content-Type": "application/json",
                "User-Agent": "AI-Engine/2.0.0"
            }
        )
        
        self.setup_interceptors()
        logger.info("Service communication initialized")
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()
        logger.info("Service communication closed")
    
    def setup_interceptors(self):
        """Setup request/response interceptors for logging and error handling"""
        # Note: httpx doesn't have built-in interceptors like axios,
        # so we'll handle this in the request methods
        pass
    
    def generate_request_id(self) -> str:
        """Generate unique request ID for tracing"""
        return f"ai_req_{int(time.time())}_{id(self)}"
    
    async def _make_request(
        self,
        method: str,
        url: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        timeout: Optional[float] = None
    ) -> Dict[str, Any]:
        """Make HTTP request with proper error handling and logging"""
        
        request_id = self.generate_request_id()
        start_time = time.time()
        
        # Prepare headers
        request_headers = {
            "X-Request-ID": request_id,
            "X-Service": "ai-engine",
            "X-Timestamp": datetime.utcnow().isoformat()
        }
        if headers:
            request_headers.update(headers)
        
        try:
            logger.info(
                f"Making {method} request",
                url=url,
                request_id=request_id,
                data_size=len(json.dumps(data)) if data else 0
            )
            
            # Make the request
            response = await self.client.request(
                method=method.upper(),
                url=url,
                json=data,
                params=params,
                headers=request_headers,
                timeout=timeout
            )
            
            response_time = time.time() - start_time
            
            # Log response
            logger.info(
                f"Request completed",
                url=url,
                request_id=request_id,
                status_code=response.status_code,
                response_time=f"{response_time:.2f}s"
            )
            
            # Handle different response types
            if response.status_code >= 400:
                error_data = {}
                try:
                    error_data = response.json()
                except:
                    error_data = {"error": response.text}
                
                raise httpx.HTTPStatusError(
                    f"HTTP {response.status_code}",
                    request=response.request,
                    response=response
                )
            
            # Try to parse JSON response
            try:
                return response.json()
            except:
                return {"message": response.text}
            
        except httpx.TimeoutException as e:
            logger.error(
                "Request timeout",
                url=url,
                request_id=request_id,
                error=str(e)
            )
            raise
        except httpx.HTTPStatusError as e:
            logger.error(
                "HTTP error",
                url=url,
                request_id=request_id,
                status_code=e.response.status_code,
                error=str(e)
            )
            raise
        except Exception as e:
            logger.error(
                "Request failed",
                url=url,
                request_id=request_id,
                error=str(e)
            )
            raise
    
    # Backend Service Communication
    async def notify_backend_generation_started(
        self,
        project_id: str,
        generation_id: str,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Notify backend that content generation has started"""
        
        url = f"{self.backend_url}/api/webhooks/ai-engine/generation-started"
        data = {
            "project_id": project_id,
            "generation_id": generation_id,
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat(),
            "service": "ai-engine"
        }
        
        return await self._make_request("POST", url, data=data)
    
    async def notify_backend_generation_completed(
        self,
        project_id: str,
        generation_id: str,
        content: Dict[str, Any],
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Notify backend that content generation is completed"""
        
        url = f"{self.backend_url}/api/webhooks/ai-engine/generation-completed"
        data = {
            "project_id": project_id,
            "generation_id": generation_id,
            "content": content,
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat(),
            "service": "ai-engine"
        }
        
        return await self._make_request("POST", url, data=data)
    
    async def notify_backend_generation_failed(
        self,
        project_id: str,
        generation_id: str,
        error: str,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Notify backend that content generation has failed"""
        
        url = f"{self.backend_url}/api/webhooks/ai-engine/generation-failed"
        data = {
            "project_id": project_id,
            "generation_id": generation_id,
            "error": error,
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat(),
            "service": "ai-engine"
        }
        
        return await self._make_request("POST", url, data=data)
    
    async def get_project_data(self, project_id: str, auth_token: Optional[str] = None) -> Dict[str, Any]:
        """Get project data from backend"""
        
        url = f"{self.backend_url}/api/projects/{project_id}"
        headers = {}
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"
        
        return await self._make_request("GET", url, headers=headers)
    
    # Hugo Generator Service Communication
    async def request_hugo_generation(
        self,
        project_data: Dict[str, Any],
        content: Dict[str, Any],
        generation_id: str
    ) -> Dict[str, Any]:
        """Request Hugo site generation"""
        
        url = f"{self.hugo_generator_url}/api/generation/generate"
        data = {
            "generation_id": generation_id,
            "project_data": project_data,
            "content": content,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return await self._make_request("POST", url, data=data, timeout=300.0)
    
    async def get_hugo_generation_status(self, generation_id: str) -> Dict[str, Any]:
        """Get Hugo generation status"""
        
        url = f"{self.hugo_generator_url}/api/generation/status/{generation_id}"
        return await self._make_request("GET", url)
    
    # Health Check Methods
    async def check_backend_health(self) -> Dict[str, Any]:
        """Check backend service health"""
        try:
            url = f"{self.backend_url}/health"
            return await self._make_request("GET", url, timeout=10.0)
        except Exception as e:
            return {"status": "unhealthy", "error": str(e)}
    
    async def check_hugo_generator_health(self) -> Dict[str, Any]:
        """Check Hugo generator service health"""
        try:
            url = f"{self.hugo_generator_url}/health"
            return await self._make_request("GET", url, timeout=10.0)
        except Exception as e:
            return {"status": "unhealthy", "error": str(e)}
    
    async def check_all_services_health(self) -> Dict[str, Any]:
        """Check health of all connected services"""
        
        backend_task = asyncio.create_task(self.check_backend_health())
        hugo_task = asyncio.create_task(self.check_hugo_generator_health())
        
        backend_health, hugo_health = await asyncio.gather(
            backend_task, hugo_task, return_exceptions=True
        )
        
        # Handle exceptions
        if isinstance(backend_health, Exception):
            backend_health = {"status": "unhealthy", "error": str(backend_health)}
        if isinstance(hugo_health, Exception):
            hugo_health = {"status": "unhealthy", "error": str(hugo_health)}
        
        # Calculate overall health
        healthy_services = 0
        total_services = 2
        
        if backend_health.get("status") == "healthy":
            healthy_services += 1
        if hugo_health.get("status") == "healthy":
            healthy_services += 1
        
        overall_status = "healthy" if healthy_services == total_services else \
                        "degraded" if healthy_services > 0 else "unhealthy"
        
        return {
            "overall_status": overall_status,
            "services": {
                "backend": backend_health,
                "hugo_generator": hugo_health
            },
            "healthy_services": f"{healthy_services}/{total_services}",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    # Utility Methods
    async def validate_service_connectivity(self) -> bool:
        """Validate connectivity to all required services"""
        try:
            health_check = await self.check_all_services_health()
            return health_check["overall_status"] in ["healthy", "degraded"]
        except Exception as e:
            logger.error(f"Service connectivity validation failed: {e}")
            return False