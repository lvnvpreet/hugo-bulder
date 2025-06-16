"""
Ollama Client Service
Handles communication with the Ollama service for LLM operations
"""

import httpx
import asyncio
import json
import time
import os
from typing import Dict, Any, List, Optional, AsyncIterator
from datetime import datetime
import structlog

logger = structlog.get_logger()

class OllamaClient:
    """Client for interacting with Ollama LLM service"""
    
    def __init__(self, base_url: str = None):
        """Initialize Ollama client with proper URL handling"""
        # Use environment variable or default to localhost
        if base_url is None:
            base_url = os.getenv("OLLAMA_HOST") or os.getenv("OLLAMA_BASE_URL") or "http://localhost:11434"
        
        # Ensure URL has protocol
        if not base_url.startswith(('http://', 'https://')):
            base_url = f"http://{base_url}"
            
        self.base_url = base_url.rstrip('/')
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(300.0),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=5)
        )
        self.available_models = []
        self._last_health_check = None
        self._health_status = False
        
        logger.info(f"Initializing Ollama client with URL: {self.base_url}")
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()
    
    async def health_check(self) -> bool:
        """Check if Ollama service is healthy"""
        try:
            # Cache health check for 30 seconds
            if (self._last_health_check and 
                (datetime.now() - self._last_health_check).seconds < 30):
                return self._health_status
            
            # Use /api/tags endpoint instead of root which doesn't exist in Ollama
            response = await self._make_request("/api/tags", method="GET")
            
            self._health_status = response is not None
            self._last_health_check = datetime.now()
            
            return self._health_status
            
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            self._last_health_check = datetime.now()
            self._health_status = False
            return False
    
    async def list_models(self) -> List[str]:
        """List all available models"""
        try:
            response = await self._make_request("/api/tags", method="GET")
            
            if response and "models" in response:
                models = [model["name"] for model in response["models"]]
                self.available_models = models
                return models
            
            return []
            
        except Exception as e:
            logger.error(f"Failed to list models: {str(e)}")
            return []
    
    async def generate(self, model: str, prompt: str, max_tokens: int = 4096, temperature: float = 0.7, **kwargs) -> Dict[str, Any]:
        """Generate text using the specified model"""
        try:
            start_time = time.time()
            
            data = {
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "num_predict": max_tokens,
                    "temperature": temperature,
                    **kwargs
                }
            }
            
            logger.info(f"Starting generation with {model}", prompt_length=len(prompt))
            
            response = await self._make_request("/api/generate", method="POST", data=data)
            generation_time = time.time() - start_time
            
            if response:
                result = {
                    "response": response.get("response", ""),
                    "model": model,
                    "done": response.get("done", True),
                    "total_duration": response.get("total_duration", 0),
                    "load_duration": response.get("load_duration", 0),
                    "prompt_eval_count": response.get("prompt_eval_count", 0),
                    "prompt_eval_duration": response.get("prompt_eval_duration", 0),
                    "eval_count": response.get("eval_count", 0),
                    "eval_duration": response.get("eval_duration", 0),
                    "generation_time": generation_time,
                }
                
                logger.info(
                    f"Generation completed with {model}",
                    prompt_length=len(prompt),
                    response_length=len(result["response"]),
                    tokens_generated=result.get("eval_count", 0),
                    generation_time=round(generation_time, 3)
                )
                
                return result
            
            raise Exception("No response received from model")
            
        except Exception as e:
            logger.error(f"Generation failed with {model}: {str(e)}")
            raise Exception(f"Generation failed: {str(e)}")
    
    async def _make_request(self, endpoint: str, method: str = "POST", data: Dict[str, Any] = None) -> Optional[Dict[str, Any]]:
        """Make HTTP request to Ollama API"""
        try:
            url = f"{self.base_url}{endpoint}"
            
            if method == "GET":
                response = await self.client.get(url)
            elif method == "POST":
                response = await self.client.post(url, json=data)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Request failed: {response.status_code} - {response.text}")
                return None
                
        except httpx.ConnectError as e:
            logger.error(f"Connection failed to {url}: {str(e)}")
            logger.error(f"Attempted to connect to: {self.base_url}")
            logger.error("Check that Ollama is running and accessible at this URL")
            return None
        except httpx.TimeoutException:
            logger.error(f"Request timeout for {endpoint}")
            return None
        except Exception as e:
            logger.error(f"Request failed for {endpoint}: {str(e)}")
            return None

    async def test_connection(self) -> Dict[str, Any]:
        """Test connection to Ollama service with detailed diagnostics"""
        result = {
            "base_url": self.base_url,
            "connected": False,
            "error": None,
            "models_available": 0,
            "response_time_ms": None
        }
        
        try:
            start_time = time.time()
            response = await self._make_request("/api/tags", method="GET")
            end_time = time.time()
            
            result["response_time_ms"] = round((end_time - start_time) * 1000, 2)
            
            if response is not None:
                result["connected"] = True
                # Try to get models
                models = await self.list_models()
                result["models_available"] = len(models)
                result["sample_models"] = models[:3] if models else []
            else:
                result["error"] = "No response from Ollama service"
                
        except Exception as e:
            result["error"] = str(e)
            
        return result
