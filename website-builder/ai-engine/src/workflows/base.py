"""
Base Workflow Classes and State Management
Foundation classes for LangGraph-based content generation workflows
"""

from langgraph.graph import Graph, StateGraph
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
import json
import structlog
import asyncio
from abc import ABC, abstractmethod

logger = structlog.get_logger()

class WorkflowStatus(Enum):
    """Workflow execution status"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PAUSED = "paused"

@dataclass
class WorkflowState:
    """Base state class for all workflows"""
    
    # Core identifiers
    project_id: str
    user_id: str
    workflow_id: str = ""
    
    # Input data
    wizard_data: Dict[str, Any] = field(default_factory=dict)
    
    # Generated content
    generated_content: Dict[str, Any] = field(default_factory=dict)
    
    # Workflow execution state
    current_step: str = ""
    progress: float = 0.0
    status: WorkflowStatus = WorkflowStatus.PENDING
    
    # Error handling
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    
    # Metadata and context
    metadata: Dict[str, Any] = field(default_factory=dict)
    context: Dict[str, Any] = field(default_factory=dict)
    
    # Execution tracking
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    last_updated: Optional[datetime] = None
    
    # Agent results
    agent_results: Dict[str, Any] = field(default_factory=dict)
    
    # Retry information
    retry_count: int = 0
    max_retries: int = 3
    
    def __post_init__(self):
        """Initialize default values after construction"""
        if not self.workflow_id:
            import uuid
            self.workflow_id = str(uuid.uuid4())
        
        if not self.started_at:
            self.started_at = datetime.utcnow()
        
        self.last_updated = datetime.utcnow()
    
    def update_progress(self, step: str, progress: float, status: WorkflowStatus = None):
        """Update workflow progress and status"""
        self.current_step = step
        self.progress = min(100.0, max(0.0, progress))
        self.last_updated = datetime.utcnow()
        
        if status:
            self.status = status
            
        if status == WorkflowStatus.COMPLETED:
            self.completed_at = datetime.utcnow()
            self.progress = 100.0
    
    def add_error(self, error: str, step: str = None):
        """Add error to workflow state"""
        error_msg = f"[{step or self.current_step}] {error}" if step else error
        self.errors.append(error_msg)
        self.last_updated = datetime.utcnow()
        
        logger.error(
            "Workflow error",
            workflow_id=self.workflow_id,
            step=step or self.current_step,
            error=error
        )
    
    def add_warning(self, warning: str, step: str = None):
        """Add warning to workflow state"""
        warning_msg = f"[{step or self.current_step}] {warning}" if step else warning
        self.warnings.append(warning_msg)
        self.last_updated = datetime.utcnow()
        
        logger.warning(
            "Workflow warning",
            workflow_id=self.workflow_id,
            step=step or self.current_step,
            warning=warning
        )
    
    def can_retry(self) -> bool:
        """Check if workflow can be retried"""
        return self.retry_count < self.max_retries
    
    def increment_retry(self):
        """Increment retry counter"""
        self.retry_count += 1
        self.last_updated = datetime.utcnow()
    
    def reset_for_retry(self):
        """Reset state for retry attempt"""
        self.errors.clear()
        self.status = WorkflowStatus.PENDING
        self.progress = 0.0
        self.current_step = ""
        self.last_updated = datetime.utcnow()
    
    def set_agent_result(self, agent_name: str, result: Any):
        """Store result from a specific agent"""
        self.agent_results[agent_name] = {
            "result": result,
            "timestamp": datetime.utcnow().isoformat(),
            "step": self.current_step
        }
    
    def get_agent_result(self, agent_name: str) -> Any:
        """Get result from a specific agent"""
        agent_data = self.agent_results.get(agent_name, {})
        return agent_data.get("result")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert state to dictionary for serialization"""
        return {
            "workflow_id": self.workflow_id,
            "project_id": self.project_id,
            "user_id": self.user_id,
            "current_step": self.current_step,
            "progress": self.progress,
            "status": self.status.value,
            "errors": self.errors,
            "warnings": self.warnings,
            "metadata": self.metadata,
            "generated_content": self.generated_content,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "last_updated": self.last_updated.isoformat() if self.last_updated else None,
            "retry_count": self.retry_count,
            "max_retries": self.max_retries,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'WorkflowState':
        """Create state from dictionary"""
        # Convert datetime strings back to datetime objects
        if data.get("started_at"):
            data["started_at"] = datetime.fromisoformat(data["started_at"])
        if data.get("completed_at"):
            data["completed_at"] = datetime.fromisoformat(data["completed_at"])
        if data.get("last_updated"):
            data["last_updated"] = datetime.fromisoformat(data["last_updated"])
        
        # Convert status string to enum
        if data.get("status"):
            data["status"] = WorkflowStatus(data["status"])
        
        return cls(**data)

class BaseWorkflow(ABC):
    """Base class for all LangGraph workflows"""
    
    def __init__(self, ollama_client=None, config: Dict[str, Any] = None):
        self.ollama_client = ollama_client
        self.config = config or {}
        self.graph = None
        self.state = None
        self.workflow_name = self.__class__.__name__
        
        # Progress tracking
        self.progress_callbacks: List[Callable] = []
        
        # Error handling
        self.error_handlers: Dict[str, Callable] = {}
        self.retry_strategies: Dict[str, Dict[str, Any]] = {}
        
        logger.info(f"Initialized workflow: {self.workflow_name}")
    
    @abstractmethod
    async def setup_graph(self) -> StateGraph:
        """Setup the LangGraph workflow - must be implemented by subclasses"""
        pass
    
    async def run(self, initial_state: WorkflowState) -> WorkflowState:
        """Execute the workflow with error handling and progress tracking"""
        
        self.state = initial_state
        self.state.status = WorkflowStatus.RUNNING
        
        logger.info(
            "Starting workflow execution",
            workflow_id=self.state.workflow_id,
            workflow_name=self.workflow_name,
            project_id=self.state.project_id
        )
        
        try:
            # Setup the graph
            self.graph = await self.setup_graph()
            
            if not self.graph:
                raise Exception("Failed to setup workflow graph")
            
            # Execute workflow with retry logic
            result = await self._execute_with_retry()
            
            # Mark as completed if no errors
            if not result.errors:
                result.update_progress("Workflow completed", 100.0, WorkflowStatus.COMPLETED)
            else:
                result.status = WorkflowStatus.FAILED
            
            logger.info(
                "Workflow execution completed",
                workflow_id=result.workflow_id,
                status=result.status.value,
                progress=result.progress,
                errors_count=len(result.errors),
                warnings_count=len(result.warnings)
            )
            
            return result
            
        except Exception as e:
            error_msg = f"Workflow execution failed: {str(e)}"
            self.state.add_error(error_msg)
            self.state.status = WorkflowStatus.FAILED
            
            logger.error(
                "Workflow execution failed",
                workflow_id=self.state.workflow_id,
                error=str(e),
                step=self.state.current_step
            )
            
            return self.state
    
    async def _execute_with_retry(self) -> WorkflowState:
        """Execute workflow with retry logic"""
        
        while True:
            try:
                # Execute the graph
                result = await self.graph.ainvoke(self.state)
                return result
                
            except Exception as e:
                error_msg = f"Execution attempt {self.state.retry_count + 1} failed: {str(e)}"
                
                if self.state.can_retry():
                    self.state.increment_retry()
                    self.state.add_warning(f"Retrying after error: {str(e)}")
                    
                    logger.warning(
                        "Workflow execution failed, retrying",
                        workflow_id=self.state.workflow_id,
                        retry_count=self.state.retry_count,
                        error=str(e)
                    )
                    
                    # Wait before retry (exponential backoff)
                    wait_time = 2 ** self.state.retry_count
                    await asyncio.sleep(min(wait_time, 30))  # Max 30 seconds
                    
                    # Reset state for retry
                    self.state.reset_for_retry()
                    
                    continue
                else:
                    # Max retries reached
                    self.state.add_error(f"Max retries reached. {error_msg}")
                    raise e
    
    def add_progress_callback(self, callback: Callable[[WorkflowState], None]):
        """Add a progress tracking callback"""
        self.progress_callbacks.append(callback)
    
    async def _notify_progress(self):
        """Notify all progress callbacks"""
        for callback in self.progress_callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(self.state)
                else:
                    callback(self.state)
            except Exception as e:
                logger.warning(f"Progress callback failed: {str(e)}")
    
    async def update_progress(self, step: str, progress: float, status: WorkflowStatus = None):
        """Update workflow progress and notify callbacks"""
        if self.state:
            self.state.update_progress(step, progress, status)
            await self._notify_progress()
            
            logger.info(
                "Progress update",
                workflow_id=self.state.workflow_id,
                step=step,
                progress=progress,
                status=status.value if status else None
            )
    
    async def add_error(self, error: str, step: str = None):
        """Add error to workflow state"""
        if self.state:
            self.state.add_error(error, step)
            await self._notify_progress()
    
    async def add_warning(self, warning: str, step: str = None):
        """Add warning to workflow state"""
        if self.state:
            self.state.add_warning(warning, step)
            await self._notify_progress()
    
    def add_error_handler(self, step: str, handler: Callable):
        """Add error handler for a specific step"""
        self.error_handlers[step] = handler
    
    def set_retry_strategy(self, step: str, max_retries: int = 3, backoff_multiplier: float = 2.0):
        """Set retry strategy for a specific step"""
        self.retry_strategies[step] = {
            "max_retries": max_retries,
            "backoff_multiplier": backoff_multiplier
        }
    
    async def handle_step_error(self, step: str, error: Exception) -> bool:
        """Handle error for a specific step, return True if handled"""
        
        if step in self.error_handlers:
            try:
                handler = self.error_handlers[step]
                if asyncio.iscoroutinefunction(handler):
                    return await handler(error, self.state)
                else:
                    return handler(error, self.state)
            except Exception as handler_error:
                logger.error(f"Error handler for {step} failed: {str(handler_error)}")
        
        return False
    
    def get_execution_summary(self) -> Dict[str, Any]:
        """Get summary of workflow execution"""
        if not self.state:
            return {"status": "not_executed"}
        
        duration = None
        if self.state.started_at and self.state.completed_at:
            duration = (self.state.completed_at - self.state.started_at).total_seconds()
        elif self.state.started_at:
            duration = (datetime.utcnow() - self.state.started_at).total_seconds()
        
        return {
            "workflow_name": self.workflow_name,
            "workflow_id": self.state.workflow_id,
            "status": self.state.status.value,
            "progress": self.state.progress,
            "current_step": self.state.current_step,
            "duration_seconds": duration,
            "errors_count": len(self.state.errors),
            "warnings_count": len(self.state.warnings),
            "retry_count": self.state.retry_count,
            "started_at": self.state.started_at.isoformat() if self.state.started_at else None,
            "completed_at": self.state.completed_at.isoformat() if self.state.completed_at else None,
        }

class WorkflowRegistry:
    """Registry for managing workflow types"""
    
    _workflows: Dict[str, type] = {}
    
    @classmethod
    def register(cls, name: str, workflow_class: type):
        """Register a workflow class"""
        cls._workflows[name] = workflow_class
    
    @classmethod
    def get(cls, name: str) -> Optional[type]:
        """Get a workflow class by name"""
        return cls._workflows.get(name)
    
    @classmethod
    def list_workflows(cls) -> List[str]:
        """List all registered workflow names"""
        return list(cls._workflows.keys())
    
    @classmethod
    def create_workflow(cls, name: str, **kwargs) -> Optional[BaseWorkflow]:
        """Create a workflow instance by name"""
        workflow_class = cls.get(name)
        if workflow_class:
            return workflow_class(**kwargs)
        return None

# Decorator for registering workflows
def register_workflow(name: str):
    """Decorator to register a workflow class"""
    def decorator(workflow_class):
        WorkflowRegistry.register(name, workflow_class)
        return workflow_class
    return decorator
