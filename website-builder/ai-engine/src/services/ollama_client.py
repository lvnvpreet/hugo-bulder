"""
Enhanced Ollama Client Service
Handles communication with Ollama LLM service with improved reliability and monitoring
"""

import httpx
import asyncio
import json
import time
import os
from typing import Dict, Any, List, Optional, AsyncIterator, Union
from datetime import datetime, timedelta
import structlog
from src.config import settings

logger = structlog.get_logger()

class OllamaClient:
    """Enhanced client for interacting with Ollama LLM service"""
    
    def __init__(self, base_url: Optional[str] = None):
        """Initialize Ollama client with robust configuration"""
        
        # Use provided URL or fall back to settings
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip('/')
        
        # Ensure URL has protocol
        if not self.base_url.startswith(('http://', 'https://')):
            self.base_url = f"http://{self.base_url}"
        
        # Create HTTP client with proper configuration
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(
                connect=10.0,
                read=float(settings.OLLAMA_TIMEOUT),
                write=30.0,
                pool=10.0
            ),
            limits=httpx.Limits(
                max_connections=10,
                max_keepalive_connections=5
            ),
            headers={
                "Content-Type": "application/json",
                "User-Agent": "AI-Engine-Ollama-Client/2.0.0"
            }
        )
        
        # Internal state
        self.available_models: List[str] = []
        self._last_health_check: Optional[datetime] = None
        self._health_status: bool = False
        self._model_cache: Dict[str, Any] = {}
        self._request_count: int = 0
        self._error_count: int = 0
        
        logger.info(f"Ollama client initialized with URL: {self.base_url}")
    
    async def close(self):
        """Close the HTTP client and cleanup resources"""
        await self.client.aclose()
        logger.info("Ollama client closed")
    
    async def _make_request(
        self,
        endpoint: str,
        method: str = "POST",
        data: Optional[Dict[str, Any]] = None,
        timeout: Optional[float] = None
    ) -> Dict[str, Any]:
        """Make HTTP request to Ollama with proper error handling"""
        
        url = f"{self.base_url}{endpoint}"
        request_timeout = timeout or settings.OLLAMA_TIMEOUT
        
        self._request_count += 1
        start_time = time.time()
        
        try:
            logger.debug(f"Making {method} request to {url}")
            
            response = await self.client.request(
                method=method,
                url=url,
                json=data,
                timeout=request_timeout
            )
            
            response_time = time.time() - start_time
            
            if response.status_code >= 400:
                self._error_count += 1
                error_msg = f"Ollama request failed: {response.status_code}"
                try:
                    error_data = response.json()
                    error_msg = error_data.get('error', error_msg)
                except:
                    error_msg = response.text or error_msg
                
                logger.error(
                    "Ollama request failed",
                    url=url,
                    status_code=response.status_code,
                    error=error_msg,
                    response_time=response_time
                )
                raise httpx.HTTPStatusError(error_msg, request=response.request, response=response)
            
            result = response.json()
            
            logger.debug(
                "Ollama request successful",
                url=url,
                response_time=f"{response_time:.2f}s"
            )
            
            return result
            
        except httpx.TimeoutException as e:
            self._error_count += 1
            logger.error(f"Ollama request timeout: {url}")
            raise
        except Exception as e:
            self._error_count += 1
            logger.error(f"Ollama request error: {e}")
            raise
    
    async def health_check(self) -> bool:
        """Check if Ollama service is healthy with caching"""
        
        # Use cached result if recent (30 seconds)
        if (self._last_health_check and 
            datetime.now() - self._last_health_check < timedelta(seconds=30)):
            return self._health_status
        
        try:
            # Use /api/tags endpoint to check service health
            await self._make_request("/api/tags", method="GET", timeout=10.0)
            self._health_status = True
            self._last_health_check = datetime.now()
            
            logger.debug("Ollama health check passed")
            return True
            
        except Exception as e:
            self._health_status = False
            self._last_health_check = datetime.now()
            
            logger.warning(f"Ollama health check failed: {e}")
            return False
    
    async def get_available_models(self, force_refresh: bool = False) -> List[Dict[str, Any]]:
        """Get list of available models with caching"""
        
        if not force_refresh and self.available_models:
            return self.available_models
        
        try:
            response = await self._make_request("/api/tags", method="GET")
            models = response.get('models', [])
            
            # Store model names for quick access
            self.available_models = [model['name'] for model in models]
            
            logger.info(f"Found {len(models)} available models")
            return models
            
        except Exception as e:
            logger.error(f"Failed to get available models: {e}")
            return []
    
    async def check_model_available(self, model_name: str) -> bool:
        """Check if a specific model is available"""
        
        models = await self.get_available_models()
        return model_name in [model['name'] for model in models]
    
    async def pull_model(self, model_name: str) -> bool:
        """Pull a model from Ollama registry"""
        
        try:
            logger.info(f"Pulling model: {model_name}")
            
            data = {"name": model_name}
            response = await self._make_request("/api/pull", data=data, timeout=600.0)
            
            logger.info(f"Successfully pulled model: {model_name}")
            
            # Refresh model cache
            await self.get_available_models(force_refresh=True)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to pull model {model_name}: {e}")
            return False
    
    async def generate(
        self,
        model: str,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        top_p: float = 0.9,
        stream: bool = False
    ) -> Union[Dict[str, Any], AsyncIterator[Dict[str, Any]]]:
        """Generate text using Ollama model"""
        
        # Ensure model is available
        if not await self.check_model_available(model):
            logger.warning(f"Model {model} not available, attempting to pull...")
            if not await self.pull_model(model):
                raise ValueError(f"Model {model} is not available and could not be pulled")
        
        # Prepare request data
        data = {
            "model": model,
            "prompt": prompt,
            "stream": stream,
            "options": {
                "temperature": temperature,
                "top_p": top_p
            }
        }
        
        if system_prompt:
            data["system"] = system_prompt
            
        if max_tokens:
            data["options"]["num_predict"] = max_tokens
        
        logger.info(
            f"Generating content with model {model}",
            prompt_length=len(prompt),
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        if stream:
            return self._generate_stream(data)
        else:
            return await self._generate_single(data)
    
    async def _generate_single(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate single response"""
        
        start_time = time.time()
        
        try:
            result = await self._make_request("/api/generate", data=data)
            
            generation_time = time.time() - start_time
            
            logger.info(
                "Content generation completed",
                model=data["model"],
                generation_time=f"{generation_time:.2f}s",
                response_length=len(result.get("response", ""))
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Content generation failed: {e}")
            raise
    
    async def _generate_stream(self, data: Dict[str, Any]) -> AsyncIterator[Dict[str, Any]]:
        """Generate streaming response"""
        
        url = f"{self.base_url}/api/generate"
        
        try:
            async with self.client.stream("POST", url, json=data) as response:
                if response.status_code >= 400:
                    error_msg = f"Streaming request failed: {response.status_code}"
                    raise httpx.HTTPStatusError(error_msg, request=response.request, response=response)
                
                async for line in response.aiter_lines():
                    if line:
                        try:
                            chunk = json.loads(line)
                            yield chunk
                        except json.JSONDecodeError:
                            continue
                            
        except Exception as e:
            logger.error(f"Streaming generation failed: {e}")
            raise
    
    async def chat(
        self,
        model: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        stream: bool = False
    ) -> Union[Dict[str, Any], AsyncIterator[Dict[str, Any]]]:
        """Chat completion using Ollama model"""
        
        # Ensure model is available
        if not await self.check_model_available(model):
            if not await self.pull_model(model):
                raise ValueError(f"Model {model} is not available")
        
        data = {
            "model": model,
            "messages": messages,
            "stream": stream,
            "options": {
                "temperature": temperature
            }
        }
        
        if max_tokens:
            data["options"]["num_predict"] = max_tokens
        
        logger.info(f"Starting chat with model {model}, {len(messages)} messages")
        
        if stream:
            return self._chat_stream(data)
        else:
            return await self._chat_single(data)
    
    async def _chat_single(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Single chat response"""
        return await self._make_request("/api/chat", data=data)
    
    async def _chat_stream(self, data: Dict[str, Any]) -> AsyncIterator[Dict[str, Any]]:
        """Streaming chat response"""
        
        url = f"{self.base_url}/api/chat"
        
        async with self.client.stream("POST", url, json=data) as response:
            if response.status_code >= 400:
                error_msg = f"Chat streaming failed: {response.status_code}"
                raise httpx.HTTPStatusError(error_msg, request=response.request, response=response)
            
            async for line in response.aiter_lines():
                if line:
                    try:
                        chunk = json.loads(line)
                        yield chunk
                    except json.JSONDecodeError:
                        continue
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get client usage statistics"""
        
        uptime = time.time() - getattr(self, '_start_time', time.time())
        error_rate = (self._error_count / max(self._request_count, 1)) * 100
        
        return {
            "base_url": self.base_url,
            "health_status": self._health_status,
            "last_health_check": self._last_health_check.isoformat() if self._last_health_check else None,
            "available_models": len(self.available_models),
            "request_count": self._request_count,
            "error_count": self._error_count,
            "error_rate": f"{error_rate:.2f}%",
            "uptime": f"{uptime:.2f}s"
        }