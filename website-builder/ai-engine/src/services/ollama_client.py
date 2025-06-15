"""
Ollama Client Service
Handles communication with the Ollama service for LLM operations
"""

import httpx
import asyncio
import json
import time
from typing import Dict, Any, List, Optional, AsyncIterator
from datetime import datetime
import structlog

logger = structlog.get_logger()

class OllamaClient:
    """Client for interacting with Ollama LLM service"""
    
    def __init__(self, base_url: str = "http://ollama:11434"):
        self.base_url = base_url.rstrip('/')
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(300.0),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=5)
        )
        self.available_models = []
        self._last_health_check = None
        self._health_status = False
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()
    
    # Model management methods
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
    
    async def pull_model(self, model_name: str) -> bool:
        """Download/pull a model"""
        try:
            logger.info(f"Pulling model: {model_name}")
            
            data = {"name": model_name}
            
            # Use streaming for model pulls as they can take a long time
            async with self.client.stream(
                "POST",
                f"{self.base_url}/api/pull",
                json=data,
                timeout=httpx.Timeout(1800.0)  # 30 minutes for model downloads
            ) as response:
                
                if response.status_code != 200:
                    logger.error(f"Model pull failed with status {response.status_code}")
                    return False
                
                # Process streaming response
                async for line in response.aiter_lines():
                    if line.strip():
                        try:
                            progress_data = json.loads(line)
                            
                            # Log progress
                            if "status" in progress_data:
                                status = progress_data["status"]
                                if "completed" in progress_data and "total" in progress_data:
                                    completed = progress_data["completed"]
                                    total = progress_data["total"]
                                    percentage = (completed / total) * 100 if total > 0 else 0
                                    logger.info(f"Model pull progress: {status} - {percentage:.1f}%")
                                else:
                                    logger.info(f"Model pull status: {status}")
                            
                            # Check for completion
                            if progress_data.get("status") == "success":
                                logger.info(f"Model {model_name} pulled successfully")
                                return True
                                
                        except json.JSONDecodeError:
                            continue
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to pull model {model_name}: {str(e)}")
            return False
    
    async def delete_model(self, model_name: str) -> bool:
        """Delete a model"""
        try:
            data = {"name": model_name}
            response = await self._make_request("/api/delete", data=data)
            
            if response is not None:
                logger.info(f"Model {model_name} deleted successfully")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to delete model {model_name}: {str(e)}")
            return False
    
    async def get_model_info(self, model_name: str) -> Dict[str, Any]:
        """Get information about a specific model"""
        try:
            data = {"name": model_name}
            response = await self._make_request("/api/show", data=data)
            
            if response:
                return response
            
            return {}
            
        except Exception as e:
            logger.error(f"Failed to get model info for {model_name}: {str(e)}")
            return {}
    
    # Generation methods
    async def generate(
        self,
        model: str,
        prompt: str,
        system_prompt: str = "",
        temperature: float = 0.7,
        max_tokens: int = 2000,
        stop_sequences: List[str] = None
    ) -> Dict[str, Any]:
        """Generate text using the specified model"""
        try:
            start_time = time.time()
            
            data = {
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": temperature,
                    "num_predict": max_tokens,
                }
            }
            
            if system_prompt:
                data["system"] = system_prompt
            
            if stop_sequences:
                data["options"]["stop"] = stop_sequences
            
            response = await self._make_request("/api/generate", data=data)
            
            generation_time = time.time() - start_time
            
            if response and "response" in response:
                result = {
                    "response": response["response"],
                    "model": model,
                    "done": response.get("done", True),
                    "context": response.get("context", []),
                    "total_duration": response.get("total_duration", 0),
                    "load_duration": response.get("load_duration", 0),
                    "prompt_eval_count": response.get("prompt_eval_count", 0),
                    "prompt_eval_duration": response.get("prompt_eval_duration", 0),
                    "eval_count": response.get("eval_count", 0),
                    "eval_duration": response.get("eval_duration", 0),
                    "generation_time": generation_time,
                }
                
                logger.info(
                    f"Generated text with {model}",
                    tokens_generated=result.get("eval_count", 0),
                    generation_time=round(generation_time, 3)
                )
                
                return result
            
            raise Exception("No response received from model")
            
        except Exception as e:
            logger.error(f"Text generation failed with {model}: {str(e)}")
            raise Exception(f"Generation failed: {str(e)}")
    
    async def generate_stream(
        self,
        model: str,
        prompt: str,
        system_prompt: str = "",
        temperature: float = 0.7
    ) -> AsyncIterator[Dict[str, Any]]:
        """Generate text with streaming response"""
        try:
            data = {
                "model": model,
                "prompt": prompt,
                "stream": True,
                "options": {
                    "temperature": temperature,
                }
            }
            
            if system_prompt:
                data["system"] = system_prompt
            
            async with self.client.stream(
                "POST",
                f"{self.base_url}/api/generate",
                json=data,
                timeout=httpx.Timeout(300.0)
            ) as response:
                
                if response.status_code != 200:
                    raise Exception(f"Stream generation failed with status {response.status_code}")
                
                async for line in response.aiter_lines():
                    if line.strip():
                        try:
                            chunk = json.loads(line)
                            yield chunk
                        except json.JSONDecodeError:
                            continue
                            
        except Exception as e:
            logger.error(f"Stream generation failed with {model}: {str(e)}")
            raise Exception(f"Stream generation failed: {str(e)}")
    
    async def chat(
        self,
        model: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> Dict[str, Any]:
        """Chat completion with message history"""
        try:
            start_time = time.time()
            
            data = {
                "model": model,
                "messages": messages,
                "stream": False,
                "options": {
                    "temperature": temperature,
                    "num_predict": max_tokens,
                }
            }
            
            response = await self._make_request("/api/chat", data=data)
            
            generation_time = time.time() - start_time
            
            if response and "message" in response:
                result = {
                    "message": response["message"],
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
                    f"Chat completion with {model}",
                    messages_count=len(messages),
                    tokens_generated=result.get("eval_count", 0),
                    generation_time=round(generation_time, 3)
                )
                
                return result
            
            raise Exception("No response received from chat model")
            
        except Exception as e:
            logger.error(f"Chat completion failed with {model}: {str(e)}")
            raise Exception(f"Chat completion failed: {str(e)}")
    
    # Health and status methods
    async def health_check(self) -> bool:
        """Check if Ollama service is healthy"""
        try:
            # Cache health check for 30 seconds
            if (self._last_health_check and 
                (datetime.now() - self._last_health_check).seconds < 30):
                return self._health_status
            
            response = await self._make_request("/", method="GET")
            
            self._health_status = response is not None
            self._last_health_check = datetime.now()
            
            return self._health_status
            
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            self._health_status = False
            self._last_health_check = datetime.now()
            return False
    
    async def get_status(self) -> Dict[str, Any]:
        """Get comprehensive status information"""
        try:
            is_healthy = await self.health_check()
            models = await self.list_models() if is_healthy else []
            
            return {
                "healthy": is_healthy,
                "base_url": self.base_url,
                "available_models": models,
                "model_count": len(models),
                "last_health_check": self._last_health_check.isoformat() if self._last_health_check else None,
                "timestamp": datetime.now().isoformat(),
            }
            
        except Exception as e:
            logger.error(f"Status check failed: {str(e)}")
            return {
                "healthy": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
            }
    
    # Utility methods
    async def _make_request(
        self,
        endpoint: str,
        method: str = "POST",
        data: Dict[str, Any] = None
    ) -> Optional[Dict[str, Any]]:
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
                
        except httpx.TimeoutException:
            logger.error(f"Request timeout for {endpoint}")
            return None
        except Exception as e:
            logger.error(f"Request failed for {endpoint}: {str(e)}")
            return None
