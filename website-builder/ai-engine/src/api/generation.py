"""
Generation API Endpoints
FastAPI endpoints for website content generation using the LangGraph workflow
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
import uuid
import asyncio
from datetime import datetime, timedelta
import json

from ..workflows.website_generation import WebsiteGenerationWorkflow
from ..workflows.base import WorkflowState, WorkflowStatus, WorkflowRegistry
from ..services.ollama_client import OllamaClient
from ..services.model_manager import ModelManager

router = APIRouter(prefix="/generation", tags=["generation"])

# Request/Response Models
class GenerationRequest(BaseModel):
    project_id: str = Field(..., description="Unique project identifier")
    user_id: str = Field(..., description="User identifier")
    wizard_data: Dict[str, Any] = Field(..., description="Complete wizard form data")
    options: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Generation options")
    callback_url: Optional[str] = Field(None, description="Webhook URL for completion notification")

class GenerationResponse(BaseModel):
    generation_id: str
    status: str
    estimated_time_minutes: int
    message: str
    started_at: str

class GenerationStatus(BaseModel):
    generation_id: str
    status: str
    progress: float
    current_step: str
    estimated_time_remaining_minutes: int
    started_at: str
    completed_at: Optional[str] = None
    content: Optional[Dict[str, Any]] = None
    errors: List[str] = []
    warnings: List[str] = []
    agent_results: Dict[str, Any] = {}

class GenerationResult(BaseModel):
    generation_id: str
    status: str
    content: Dict[str, Any]
    metadata: Dict[str, Any]
    validation: Dict[str, Any]
    generated_at: str
    total_time_seconds: float

# In-memory storage for generation status (use Redis in production)
generation_status_store: Dict[str, Dict[str, Any]] = {}
generation_results_store: Dict[str, Dict[str, Any]] = {}

# Cleanup old generations (longer than 24 hours)
async def cleanup_old_generations():
    """Clean up generations older than 24 hours"""
    cutoff_time = datetime.utcnow() - timedelta(hours=24)
    
    to_remove = []
    for gen_id, status_data in generation_status_store.items():
        start_time_str = status_data.get("started_at")
        if start_time_str:
            try:
                start_time = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
                if start_time < cutoff_time:
                    to_remove.append(gen_id)
            except ValueError:
                to_remove.append(gen_id)  # Remove if timestamp is invalid
    
    for gen_id in to_remove:
        generation_status_store.pop(gen_id, None)
        generation_results_store.pop(gen_id, None)

# Dependencies
def get_ollama_client() -> OllamaClient:
    """Get Ollama client from app state"""
    from main import app
    return app.state.ollama_client

def get_model_manager() -> ModelManager:
    """Get model manager from app state"""
    from main import app
    return app.state.model_manager

@router.post("/start", response_model=GenerationResponse)
async def start_generation(
    request: GenerationRequest,
    background_tasks: BackgroundTasks,
    ollama_client: OllamaClient = Depends(get_ollama_client),
    model_manager: ModelManager = Depends(get_model_manager)
):
    """Start website content generation workflow"""
    
    # Clean up old generations
    await cleanup_old_generations()
    
    # Validate request
    if not request.wizard_data:
        raise HTTPException(status_code=400, detail="Wizard data is required")
    
    if not request.wizard_data.get("businessInfo", {}).get("name"):
        raise HTTPException(status_code=400, detail="Business name is required in wizard data")
    
    # Check if Ollama is available
    if not ollama_client or not await ollama_client.health_check():
        raise HTTPException(
            status_code=503, 
            detail="AI service is currently unavailable. Please try again later."
        )
    
    # Check if models are available
    if model_manager:
        health_report = await model_manager.get_health_report()
        if health_report.get("overall_status") == "critical":
            raise HTTPException(
                status_code=503,
                detail="AI models are not available. Please contact support."
            )
    
    generation_id = str(uuid.uuid4())
    started_at = datetime.utcnow()
    
    # Initialize status
    generation_status_store[generation_id] = {
        "status": WorkflowStatus.PENDING.value,
        "progress": 0.0,
        "current_step": "Initializing",
        "errors": [],
        "warnings": [],
        "agent_results": {},
        "started_at": started_at.isoformat(),
        "completed_at": None,
        "estimated_time_minutes": 8,  # Realistic estimate
        "project_id": request.project_id,
        "user_id": request.user_id,
        "callback_url": request.callback_url
    }
    
    # Start generation in background
    background_tasks.add_task(
        run_generation_workflow,
        generation_id,
        request,
        ollama_client
    )
    
    return GenerationResponse(
        generation_id=generation_id,
        status=WorkflowStatus.PENDING.value,
        estimated_time_minutes=8,
        message="Website generation started successfully",
        started_at=started_at.isoformat()
    )

@router.get("/status/{generation_id}", response_model=GenerationStatus)
async def get_generation_status(generation_id: str):
    """Get current generation status and progress"""
    
    if generation_id not in generation_status_store:
        raise HTTPException(status_code=404, detail="Generation not found")
    
    status_data = generation_status_store[generation_id]
    
    # Calculate estimated time remaining
    estimated_remaining = 0
    if status_data["status"] == WorkflowStatus.RUNNING.value:
        progress = status_data["progress"]
        if progress > 0:
            elapsed_minutes = (datetime.utcnow() - datetime.fromisoformat(status_data["started_at"])).seconds / 60
            total_estimated = elapsed_minutes / (progress / 100)
            estimated_remaining = max(0, int(total_estimated - elapsed_minutes))
    
    return GenerationStatus(
        generation_id=generation_id,
        status=status_data["status"],
        progress=status_data["progress"],
        current_step=status_data["current_step"],
        estimated_time_remaining_minutes=estimated_remaining,
        started_at=status_data["started_at"],
        completed_at=status_data.get("completed_at"),
        content=status_data.get("content"),
        errors=status_data["errors"],
        warnings=status_data["warnings"],
        agent_results=status_data.get("agent_results", {})
    )

@router.get("/result/{generation_id}", response_model=GenerationResult)
async def get_generation_result(generation_id: str):
    """Get completed generation result"""
    
    if generation_id not in generation_status_store:
        raise HTTPException(status_code=404, detail="Generation not found")
    
    status_data = generation_status_store[generation_id]
    
    if status_data["status"] not in [WorkflowStatus.COMPLETED.value, WorkflowStatus.FAILED.value]:
        raise HTTPException(status_code=409, detail="Generation is not completed yet")
    
    # Get result data
    result_data = generation_results_store.get(generation_id)
    if not result_data:
        raise HTTPException(status_code=404, detail="Generation result not found")
    
    # Calculate total time
    started_at = datetime.fromisoformat(status_data["started_at"])
    completed_at = datetime.fromisoformat(status_data["completed_at"]) if status_data.get("completed_at") else datetime.utcnow()
    total_time = (completed_at - started_at).total_seconds()
    
    return GenerationResult(
        generation_id=generation_id,
        status=status_data["status"],
        content=result_data.get("content", {}),
        metadata=result_data.get("metadata", {}),
        validation=result_data.get("validation", {}),
        generated_at=status_data.get("completed_at", datetime.utcnow().isoformat()),
        total_time_seconds=total_time
    )

@router.delete("/cancel/{generation_id}")
async def cancel_generation(generation_id: str):
    """Cancel a running generation"""
    
    if generation_id not in generation_status_store:
        raise HTTPException(status_code=404, detail="Generation not found")
    
    status_data = generation_status_store[generation_id]
    
    if status_data["status"] not in [WorkflowStatus.PENDING.value, WorkflowStatus.RUNNING.value]:
        raise HTTPException(status_code=409, detail="Generation cannot be cancelled in current state")
    
    # Mark as cancelled
    status_data["status"] = WorkflowStatus.CANCELLED.value
    status_data["completed_at"] = datetime.utcnow().isoformat()
    
    return {
        "generation_id": generation_id,
        "status": "cancelled",
        "message": "Generation cancelled successfully"
    }

@router.get("/list")
async def list_generations(
    user_id: Optional[str] = None,
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50
):
    """List generations with optional filters"""
    
    await cleanup_old_generations()
    
    generations = []
    
    for gen_id, status_data in list(generation_status_store.items())[:limit]:
        # Apply filters
        if user_id and status_data.get("user_id") != user_id:
            continue
        if project_id and status_data.get("project_id") != project_id:
            continue
        if status and status_data.get("status") != status:
            continue
        
        generations.append({
            "generation_id": gen_id,
            "status": status_data["status"],
            "progress": status_data["progress"],
            "current_step": status_data["current_step"],
            "started_at": status_data["started_at"],
            "completed_at": status_data.get("completed_at"),
            "project_id": status_data.get("project_id"),
            "user_id": status_data.get("user_id")
        })
    
    return {
        "generations": generations,
        "total": len(generations),
        "filters_applied": {
            "user_id": user_id,
            "project_id": project_id,
            "status": status
        }
    }

@router.post("/retry/{generation_id}")
async def retry_generation(
    generation_id: str,
    background_tasks: BackgroundTasks,
    ollama_client: OllamaClient = Depends(get_ollama_client)
):
    """Retry a failed generation"""
    
    if generation_id not in generation_status_store:
        raise HTTPException(status_code=404, detail="Generation not found")
    
    status_data = generation_status_store[generation_id]
    
    if status_data["status"] != WorkflowStatus.FAILED.value:
        raise HTTPException(status_code=409, detail="Only failed generations can be retried")
    
    # Reset status for retry
    status_data["status"] = WorkflowStatus.PENDING.value
    status_data["progress"] = 0.0
    status_data["current_step"] = "Retrying"
    status_data["errors"] = []
    status_data["warnings"] = []
    status_data["completed_at"] = None
    
    # Recreate request from stored data
    request = GenerationRequest(
        project_id=status_data["project_id"],
        user_id=status_data["user_id"],
        wizard_data=generation_results_store.get(generation_id, {}).get("wizard_data", {}),
        callback_url=status_data.get("callback_url")
    )
    
    # Start retry in background
    background_tasks.add_task(
        run_generation_workflow,
        generation_id,
        request,
        ollama_client
    )
    
    return {
        "generation_id": generation_id,
        "status": "retrying",
        "message": "Generation retry started"
    }

async def run_generation_workflow(
    generation_id: str, 
    request: GenerationRequest,
    ollama_client: OllamaClient
):
    """Run the complete generation workflow"""
    
    try:
        # Update status to running
        generation_status_store[generation_id]["status"] = WorkflowStatus.RUNNING.value
        generation_status_store[generation_id]["current_step"] = "Initializing workflow"
        
        # Initialize workflow
        workflow_config = request.options.get("workflow_config", {})
        workflow = WebsiteGenerationWorkflow(ollama_client, workflow_config)
        
        # Add progress callback
        async def update_progress_callback(state: WorkflowState):
            if generation_id in generation_status_store:
                generation_status_store[generation_id].update({
                    "progress": state.progress,
                    "current_step": state.current_step,
                    "errors": state.errors,
                    "warnings": state.warnings,
                    "agent_results": {
                        agent: {"success": result.get("success", False), "execution_time": result.get("execution_time", 0)}
                        for agent, result in state.agent_results.items()
                    }
                })
        
        workflow.add_progress_callback(update_progress_callback)
        
        # Create initial state
        initial_state = WorkflowState(
            project_id=request.project_id,
            user_id=request.user_id,
            wizard_data=request.wizard_data
        )
        
        # Execute workflow
        final_state = await workflow.run(initial_state)
        
        # Store wizard data for potential retry
        generation_results_store[generation_id] = {
            "wizard_data": request.wizard_data
        }
        
        # Update final status
        completed_at = datetime.utcnow().isoformat()
        
        if final_state.status == WorkflowStatus.COMPLETED:
            # Success
            final_output = final_state.metadata.get("final_output", {})
            
            generation_status_store[generation_id].update({
                "status": WorkflowStatus.COMPLETED.value,
                "progress": 100.0,
                "current_step": "Completed",
                "completed_at": completed_at,
                "content": final_output
            })
            
            # Store detailed results
            generation_results_store[generation_id].update({
                "content": final_output.get("content", {}),
                "metadata": final_output.get("metadata", {}),
                "validation": final_output.get("validation", {}),
                "seo": final_output.get("seo", {}),
                "structure": final_output.get("structure", {}),
                "navigation": final_output.get("navigation", {})
            })
            
        else:
            # Failed
            generation_status_store[generation_id].update({
                "status": WorkflowStatus.FAILED.value,
                "completed_at": completed_at,
                "errors": final_state.errors
            })
            
            # Store partial results if available
            partial_output = final_state.metadata.get("partial_output")
            if partial_output:
                generation_results_store[generation_id].update({
                    "partial_content": partial_output.get("content", {}),
                    "completed_steps": partial_output.get("completed_steps", [])
                })
        
        # Send webhook notification if callback URL provided
        if request.callback_url:
            await send_webhook_notification(generation_id, request.callback_url, final_state.status)
        
    except Exception as e:
        # Workflow execution failed
        generation_status_store[generation_id].update({
            "status": WorkflowStatus.FAILED.value,
            "completed_at": datetime.utcnow().isoformat(),
            "errors": [f"Workflow execution failed: {str(e)}"]
        })
        
        # Log the error
        import structlog
        logger = structlog.get_logger()
        logger.error(
            "Generation workflow failed",
            generation_id=generation_id,
            error=str(e),
            project_id=request.project_id
        )

async def send_webhook_notification(generation_id: str, callback_url: str, status: WorkflowStatus):
    """Send webhook notification for generation completion"""
    
    try:
        import httpx
        
        payload = {
            "generation_id": generation_id,
            "status": status.value,
            "completed_at": datetime.utcnow().isoformat(),
            "result_url": f"/api/v1/generation/result/{generation_id}"
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(callback_url, json=payload)
            response.raise_for_status()
            
    except Exception as e:
        # Log webhook failure but don't fail the generation
        import structlog
        logger = structlog.get_logger()
        logger.warning(
            "Webhook notification failed",
            generation_id=generation_id,
            callback_url=callback_url,
            error=str(e)
        )

# Health check endpoint
@router.get("/health")
async def generation_health():
    """Check generation service health"""
    
    active_generations = sum(
        1 for status in generation_status_store.values()
        if status["status"] == WorkflowStatus.RUNNING.value
    )
    
    return {
        "status": "healthy",
        "active_generations": active_generations,
        "total_stored_generations": len(generation_status_store),
        "workflow_types": list(WorkflowRegistry.list_workflows()),
        "timestamp": datetime.utcnow().isoformat()
    }
