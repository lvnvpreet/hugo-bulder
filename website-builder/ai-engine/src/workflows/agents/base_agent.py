"""
Base Agent Class
Foundation class for all specialized AI agents in the workflow system
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
import json
import re
import time
import structlog
from datetime import datetime

from ..base import WorkflowState
from ...services.ollama_client import OllamaClient
from ...config.models import get_system_prompt, get_recommended_settings

logger = structlog.get_logger()

class BaseAgent(ABC):
    """Base class for all AI agents in the workflow system"""
    
    def __init__(
        self, 
        ollama_client: OllamaClient, 
        model: str = None,
        task_type: str = "content_generation",
        agent_config: Dict[str, Any] = None
    ):
        self.ollama_client = ollama_client
        self.task_type = task_type
        self.agent_config = agent_config or {}
        
        # Get recommended settings for task type
        settings = get_recommended_settings(task_type)
        self.model = model or settings["model"]
        self.default_temperature = settings["temperature"]
        self.default_max_tokens = settings["max_tokens"]
        
        # Get system prompt for task type
        self.system_prompt = get_system_prompt(task_type)
        
        # Agent identification
        self.agent_name = self.__class__.__name__
        self.agent_id = f"{self.agent_name}_{int(time.time())}"
        
        # Performance tracking
        self.execution_stats = {
            "total_executions": 0,
            "successful_executions": 0,
            "total_tokens": 0,
            "total_time": 0.0,
            "last_execution": None,
        }
        
        logger.info(
            f"Initialized agent: {self.agent_name}",
            model=self.model,
            task_type=self.task_type
        )
    
    @abstractmethod
    async def execute(self, state: WorkflowState) -> WorkflowState:
        """
        Execute the agent's main logic
        Must be implemented by subclasses
        """
        pass
    
    async def generate_content(
        self,
        prompt: str,
        context: Dict[str, Any] = None,
        temperature: float = None,
        max_tokens: int = None,
        stop_sequences: List[str] = None,
        system_prompt: str = None
    ) -> str:
        """Generate content using Ollama LLM"""
        
        start_time = time.time()
        
        try:
            # Use defaults if not specified
            temperature = temperature if temperature is not None else self.default_temperature
            max_tokens = max_tokens if max_tokens is not None else self.default_max_tokens
            system_prompt = system_prompt or self.system_prompt
            
            # Build the complete prompt
            full_prompt = self._build_prompt(prompt, context)
            
            logger.debug(
                f"Generating content with {self.agent_name}",
                model=self.model,
                temperature=temperature,
                max_tokens=max_tokens,
                prompt_length=len(full_prompt)
            )
            
            # Generate content
            response = await self.ollama_client.generate(
                model=self.model,
                prompt=full_prompt,
                system_prompt=system_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
                stop_sequences=stop_sequences
            )
            
            generation_time = time.time() - start_time
            content = response.get("response", "")
            
            # Update statistics
            self._update_stats(
                success=True,
                tokens=response.get("eval_count", 0),
                time_taken=generation_time
            )
            
            logger.info(
                f"Content generated successfully",
                agent=self.agent_name,
                model=self.model,
                tokens=response.get("eval_count", 0),
                time_taken=round(generation_time, 3)
            )
            
            return content
            
        except Exception as e:
            generation_time = time.time() - start_time
            self._update_stats(success=False, time_taken=generation_time)
            
            logger.error(
                f"Content generation failed",
                agent=self.agent_name,
                model=self.model,
                error=str(e),
                time_taken=round(generation_time, 3)
            )
            
            raise Exception(f"Content generation failed: {str(e)}")
    
    async def generate_structured_content(
        self,
        prompt: str,
        context: Dict[str, Any] = None,
        schema: Dict[str, Any] = None,
        temperature: float = 0.2,
        max_retries: int = 3
    ) -> Dict[str, Any]:
        """Generate structured content (JSON) with validation"""
        
        # Build structured prompt
        structured_prompt = self._build_structured_prompt(prompt, schema)
        
        for attempt in range(max_retries):
            try:
                content = await self.generate_content(
                    prompt=structured_prompt,
                    context=context,
                    temperature=temperature,
                    system_prompt="You are a data structuring expert. Return only valid JSON without additional text."
                )
                
                # Extract and validate JSON
                structured_data = self._extract_json(content)
                
                # Validate against schema if provided
                if schema:
                    self._validate_schema(structured_data, schema)
                
                return structured_data
                
            except (json.JSONDecodeError, ValueError) as e:
                logger.warning(
                    f"Structured content generation attempt {attempt + 1} failed",
                    agent=self.agent_name,
                    error=str(e)
                )
                
                if attempt == max_retries - 1:
                    raise Exception(f"Failed to generate valid structured content after {max_retries} attempts")
                
                # Increase temperature slightly for retry
                temperature = min(temperature + 0.1, 0.8)
        
        raise Exception("Structured content generation failed")
    
    def _build_prompt(self, prompt: str, context: Dict[str, Any] = None) -> str:
        """Build complete prompt with context"""
        
        if not context:
            return prompt
        
        # Build context section
        context_lines = []
        for key, value in context.items():
            if isinstance(value, (dict, list)):
                value_str = json.dumps(value, indent=2)
            else:
                value_str = str(value)
            
            context_lines.append(f"{key.replace('_', ' ').title()}: {value_str}")
        
        context_str = "\n".join(context_lines)
        
        return f"""Context Information:
{context_str}

Task:
{prompt}

Please provide a comprehensive response based on the context information above."""
    
    def _build_structured_prompt(self, prompt: str, schema: Dict[str, Any] = None) -> str:
        """Build prompt for structured JSON output"""
        
        base_prompt = f"""
{prompt}

Response Requirements:
- Respond ONLY with valid JSON
- Do not include any explanatory text before or after the JSON
- Ensure all JSON keys and values are properly formatted
- Use double quotes for all strings
"""
        
        if schema:
            schema_str = json.dumps(schema, indent=2)
            base_prompt += f"""
- Follow this JSON schema structure:
{schema_str}
"""
        
        return base_prompt
    
    def _extract_json(self, response: str) -> Dict[str, Any]:
        """Extract JSON from LLM response"""
        
        # Clean the response
        response = response.strip()
        
        # Try to find JSON in response (look for { ... })
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            json_str = json_match.group()
            try:
                return json.loads(json_str)
            except json.JSONDecodeError as e:
                logger.debug(f"JSON decode error: {str(e)}, content: {json_str[:200]}...")
        
        # Try to parse the entire response as JSON
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            pass
        
        # Try to find JSON array
        array_match = re.search(r'\[.*\]', response, re.DOTALL)
        if array_match:
            json_str = array_match.group()
            try:
                return {"items": json.loads(json_str)}
            except json.JSONDecodeError:
                pass
        
        raise ValueError(f"No valid JSON found in response: {response[:200]}...")
    
    def _validate_schema(self, data: Dict[str, Any], schema: Dict[str, Any]):
        """Basic schema validation"""
        
        if "required" in schema:
            for required_field in schema["required"]:
                if required_field not in data:
                    raise ValueError(f"Required field '{required_field}' missing from response")
        
        if "properties" in schema:
            for field, field_schema in schema["properties"].items():
                if field in data:
                    expected_type = field_schema.get("type")
                    actual_value = data[field]
                    
                    # Basic type checking
                    if expected_type == "string" and not isinstance(actual_value, str):
                        raise ValueError(f"Field '{field}' should be string, got {type(actual_value)}")
                    elif expected_type == "number" and not isinstance(actual_value, (int, float)):
                        raise ValueError(f"Field '{field}' should be number, got {type(actual_value)}")
                    elif expected_type == "array" and not isinstance(actual_value, list):
                        raise ValueError(f"Field '{field}' should be array, got {type(actual_value)}")
                    elif expected_type == "object" and not isinstance(actual_value, dict):
                        raise ValueError(f"Field '{field}' should be object, got {type(actual_value)}")
    
    def _update_stats(self, success: bool, tokens: int = 0, time_taken: float = 0.0):
        """Update agent execution statistics"""
        
        self.execution_stats["total_executions"] += 1
        if success:
            self.execution_stats["successful_executions"] += 1
        
        self.execution_stats["total_tokens"] += tokens
        self.execution_stats["total_time"] += time_taken
        self.execution_stats["last_execution"] = datetime.utcnow().isoformat()
    
    async def validate_inputs(self, state: WorkflowState) -> List[str]:
        """Validate inputs before execution - override in subclasses"""
        errors = []
        
        if not state.wizard_data:
            errors.append("No wizard data provided")
        
        return errors
    
    async def pre_execute(self, state: WorkflowState) -> WorkflowState:
        """Pre-execution hook - override in subclasses"""
        return state
    
    async def post_execute(self, state: WorkflowState) -> WorkflowState:
        """Post-execution hook - override in subclasses"""
        return state
    
    async def safe_execute(self, state: WorkflowState) -> WorkflowState:
        """Execute agent with error handling and validation"""
        
        start_time = time.time()
        
        try:
            logger.info(
                f"Starting agent execution: {self.agent_name}",
                workflow_id=state.workflow_id,
                current_step=state.current_step
            )
            
            # Validate inputs
            validation_errors = await self.validate_inputs(state)
            if validation_errors:
                for error in validation_errors:
                    state.add_error(error, self.agent_name)
                return state
            
            # Pre-execution hook
            state = await self.pre_execute(state)
            
            # Main execution
            result_state = await self.execute(state)
            
            # Post-execution hook
            result_state = await self.post_execute(result_state)
            
            # Store agent result
            execution_time = time.time() - start_time
            result_state.set_agent_result(self.agent_name, {
                "success": True,
                "execution_time": execution_time,
                "model_used": self.model,
                "stats": self.execution_stats.copy()
            })
            
            logger.info(
                f"Agent execution completed: {self.agent_name}",
                workflow_id=result_state.workflow_id,
                execution_time=round(execution_time, 3),
                success=True
            )
            
            return result_state
            
        except Exception as e:
            execution_time = time.time() - start_time
            error_msg = f"Agent {self.agent_name} failed: {str(e)}"
            
            state.add_error(error_msg, self.agent_name)
            state.set_agent_result(self.agent_name, {
                "success": False,
                "error": str(e),
                "execution_time": execution_time,
                "model_used": self.model,
                "stats": self.execution_stats.copy()
            })
            
            logger.error(
                f"Agent execution failed: {self.agent_name}",
                workflow_id=state.workflow_id,
                error=str(e),
                execution_time=round(execution_time, 3)
            )
            
            return state
    
    def get_agent_info(self) -> Dict[str, Any]:
        """Get agent information and statistics"""
        
        success_rate = 0.0
        if self.execution_stats["total_executions"] > 0:
            success_rate = (self.execution_stats["successful_executions"] / 
                          self.execution_stats["total_executions"]) * 100
        
        avg_time = 0.0
        if self.execution_stats["total_executions"] > 0:
            avg_time = self.execution_stats["total_time"] / self.execution_stats["total_executions"]
        
        return {
            "agent_name": self.agent_name,
            "agent_id": self.agent_id,
            "model": self.model,
            "task_type": self.task_type,
            "system_prompt_preview": self.system_prompt[:100] + "..." if len(self.system_prompt) > 100 else self.system_prompt,
            "default_temperature": self.default_temperature,
            "default_max_tokens": self.default_max_tokens,
            "statistics": {
                "total_executions": self.execution_stats["total_executions"],
                "successful_executions": self.execution_stats["successful_executions"],
                "success_rate_percent": round(success_rate, 2),
                "total_tokens_generated": self.execution_stats["total_tokens"],
                "total_execution_time": round(self.execution_stats["total_time"], 3),
                "average_execution_time": round(avg_time, 3),
                "last_execution": self.execution_stats["last_execution"],
            }
        }
