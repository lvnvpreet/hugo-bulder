"""
Advanced Generation API Endpoints
Handles complex workflow-based content generation with backend integration
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends, Request
from pydantic import BaseModel, Field, validator
from typing import Dict, Any, Optional, List, Union
import uuid
import time
from datetime import datetime
from enum import Enum
import structlog

from ..services.ollama_client import OllamaClient
from ..services.model_manager import ModelManager
from ..services.service_communication import ServiceCommunication
from ..config import settings

logger = structlog.get_logger()
router = APIRouter()

# Enhanced Request/Response Models
class GenerationType(str, Enum):
    WEBSITE_CONTENT = "website_content"
    BLOG_POST = "blog_post"
    PRODUCT_DESCRIPTION = "product_description"
    MARKETING_COPY = "marketing_copy"
    SEO_CONTENT = "seo_content"

class WorkflowStatus(str, Enum):
    QUEUED = "queued"
    INITIALIZING = "initializing"
    ANALYZING = "analyzing"
    GENERATING = "generating"
    OPTIMIZING = "optimizing"
    FINALIZING = "finalizing"
    COMPLETED = "completed"
    FAILED = "failed"

class AdvancedGenerationRequest(BaseModel):
    """Advanced generation request with full project context"""
    project_id: str = Field(..., description="Project ID from backend")
    generation_type: GenerationType = Field(..., description="Type of generation")
    
    # Business context
    business_context: Dict[str, Any] = Field(..., description="Business information")
    content_requirements: Dict[str, Any] = Field(..., description="Content requirements")
    
    # Generation options
    workflow_options: Dict[str, Any] = Field(default={}, description="Workflow configuration")
    quality_level: str = Field(default="standard", description="Quality level: basic, standard, premium")
    include_analytics: bool = Field(default=True, description="Include content analytics")
    
    # Integration options
    auto_notify_backend: bool = Field(default=True, description="Auto-notify backend on completion")
    request_hugo_generation: bool = Field(default=False, description="Request Hugo site generation")
    
    # Metadata
    user_id: Optional[str] = Field(None, description="User ID")
    auth_token: Optional[str] = Field(None, description="Authentication token")

class WorkflowStep(BaseModel):
    """Individual workflow step information"""
    step_name: str = Field(..., description="Step name")
    status: str = Field(..., description="Step status")
    started_at: Optional[datetime] = Field(None, description="Step start time")
    completed_at: Optional[datetime] = Field(None, description="Step completion time")
    duration: Optional[float] = Field(None, description="Step duration in seconds")
    output: Optional[Dict[str, Any]] = Field(None, description="Step output")
    error: Optional[str] = Field(None, description="Step error message")

class AdvancedGenerationResponse(BaseModel):
    """Advanced generation response with workflow tracking"""
    generation_id: str = Field(..., description="Generation ID")
    project_id: str = Field(..., description="Project ID")
    status: WorkflowStatus = Field(..., description="Overall workflow status")
    
    # Progress tracking
    progress: float = Field(default=0.0, description="Progress percentage")
    current_step: Optional[str] = Field(None, description="Current workflow step")
    workflow_steps: List[WorkflowStep] = Field(default=[], description="Workflow step history")
    
    # Generated content
    content: Dict[str, Any] = Field(default={}, description="Generated content")
    metadata: Dict[str, Any] = Field(default={}, description="Generation metadata")
    analytics: Optional[Dict[str, Any]] = Field(None, description="Content analytics")
    
    # Timing
    created_at: datetime = Field(..., description="Creation timestamp")
    completed_at: Optional[datetime] = Field(None, description="Completion timestamp")
    estimated_completion: Optional[datetime] = Field(None, description="Estimated completion")
    
    # Integration status
    backend_notified: bool = Field(default=False, description="Backend notification status")
    hugo_generation_requested: bool = Field(default=False, description="Hugo generation status")

# In-memory storage for advanced generations
advanced_generation_store: Dict[str, Dict[str, Any]] = {}

# Dependency injection
async def get_ollama_client() -> OllamaClient:
    from main import app
    return app.state.ollama_client

async def get_model_manager() -> ModelManager:
    from main import app
    return app.state.model_manager

async def get_service_communication() -> ServiceCommunication:
    from main import app
    return app.state.service_communication

@router.post("/generation/advanced", response_model=AdvancedGenerationResponse)
async def start_advanced_generation(
    request: AdvancedGenerationRequest,
    background_tasks: BackgroundTasks,
    http_request: Request,
    model_manager: ModelManager = Depends(get_model_manager),
    service_comm: ServiceCommunication = Depends(get_service_communication)
):
    """
    Start advanced content generation with full workflow tracking
    """
    
    generation_id = str(uuid.uuid4())
    request_id = getattr(http_request.state, 'request_id', 'unknown')
    
    logger.info("🚀 [DEBUG] ===== AI ENGINE GENERATION START =====")
    logger.info("🚀 [DEBUG] Generation ID:", generation_id=generation_id)
    logger.info("🚀 [DEBUG] Project ID:", project_id=request.project_id)
    logger.info("🚀 [DEBUG] Generation type:", generation_type=request.generation_type)
    logger.info("🚀 [DEBUG] Quality level:", quality_level=request.quality_level)
    logger.info("🚀 [DEBUG] Request ID:", request_id=request_id)
    logger.info("🚀 [DEBUG] Business context:", business_context=request.business_context)
    logger.info("🚀 [DEBUG] Content requirements:", content_requirements=request.content_requirements)
    logger.info("🚀 [DEBUG] Model settings:", model_settings=request.model_settings)
    
    logger.info(
        "Advanced generation requested",
        generation_id=generation_id,
        project_id=request.project_id,
        generation_type=request.generation_type,
        quality_level=request.quality_level
    )
    
    # Validate project access if auth token provided
    if request.auth_token:
        try:
            logger.info("🔍 [DEBUG] Validating project access with auth token")
            project_data = await service_comm.get_project_data(
                request.project_id, 
                request.auth_token
            )
            logger.info("🔍 [DEBUG] Project data received:", project_data=bool(project_data))
            if not project_data:
                logger.error("❌ [DEBUG] Project access denied - no project data")
                raise HTTPException(status_code=403, detail="Project access denied")
            logger.info("✅ [DEBUG] Project access validated successfully")
        except Exception as e:
            logger.error("❌ [DEBUG] Failed to validate project access:", error=str(e), exc_info=True)
            logger.warning(f"Failed to validate project access: {e}")
    else:
        logger.info("⚠️ [DEBUG] No auth token provided, skipping project validation")
    
    # Initialize generation record
    generation_record = {
        "generation_id": generation_id,
        "project_id": request.project_id,
        "status": WorkflowStatus.QUEUED,
        "request": request.dict(),
        "progress": 0.0,
        "current_step": None,
        "workflow_steps": [],
        "content": {},
        "metadata": {
            "request_id": request_id,
            "generation_type": request.generation_type,
            "quality_level": request.quality_level,
            "models_used": [],
            "total_tokens": 0,
            "generation_time": None
        },
        "analytics": None,
        "created_at": datetime.utcnow(),
        "completed_at": None,
        "estimated_completion": None,
        "backend_notified": False,
        "hugo_generation_requested": False,
        "error": None
    }
    
    advanced_generation_store[generation_id] = generation_record
    
    # Start background processing
    background_tasks.add_task(
        process_advanced_generation,
        generation_id,
        request,
        model_manager,
        service_comm
    )
    
    return AdvancedGenerationResponse(
        generation_id=generation_id,
        project_id=request.project_id,
        status=WorkflowStatus.QUEUED,
        progress=0.0,
        content={},
        metadata=generation_record["metadata"],
        created_at=generation_record["created_at"]
    )

@router.get("/generation/{generation_id}", response_model=AdvancedGenerationResponse)
async def get_advanced_generation_status(generation_id: str):
    """
    Get detailed status of an advanced generation
    """
    
    if generation_id not in advanced_generation_store:
        raise HTTPException(status_code=404, detail="Generation not found")
    
    record = advanced_generation_store[generation_id]
    
    # Convert workflow steps to response format
    workflow_steps = [
        WorkflowStep(
            step_name=step["step_name"],
            status=step["status"],
            started_at=step.get("started_at"),
            completed_at=step.get("completed_at"),
            duration=step.get("duration"),
            output=step.get("output"),
            error=step.get("error")
        )
        for step in record["workflow_steps"]
    ]
    
    return AdvancedGenerationResponse(
        generation_id=generation_id,
        project_id=record["project_id"],
        status=record["status"],
        progress=record["progress"],
        current_step=record["current_step"],
        workflow_steps=workflow_steps,
        content=record["content"],
        metadata=record["metadata"],
        analytics=record["analytics"],
        created_at=record["created_at"],
        completed_at=record["completed_at"],
        estimated_completion=record["estimated_completion"],
        backend_notified=record["backend_notified"],
        hugo_generation_requested=record["hugo_generation_requested"]
    )

@router.post("/generation/{generation_id}/cancel")
async def cancel_generation(generation_id: str):
    """
    Cancel an ongoing generation
    """
    
    if generation_id not in advanced_generation_store:
        raise HTTPException(status_code=404, detail="Generation not found")
    
    record = advanced_generation_store[generation_id]
    
    if record["status"] in [WorkflowStatus.COMPLETED, WorkflowStatus.FAILED]:
        raise HTTPException(status_code=400, detail="Generation already completed")
    
    # Mark as cancelled (we'll treat it as failed with specific message)
    record["status"] = WorkflowStatus.FAILED
    record["completed_at"] = datetime.utcnow()
    record["error"] = "Generation cancelled by user"
    
    logger.info(f"Generation {generation_id} cancelled")
    
    return {
        "success": True,
        "message": f"Generation {generation_id} cancelled successfully"
    }

@router.delete("/generation/{generation_id}")
async def delete_generation(generation_id: str):
    """
    Delete a generation record
    """
    
    if generation_id not in advanced_generation_store:
        raise HTTPException(status_code=404, detail="Generation not found")
    
    del advanced_generation_store[generation_id]
    
    return {
        "success": True,
        "message": f"Generation {generation_id} deleted successfully"
    }

@router.get("/generation")
async def list_advanced_generations(
    limit: int = 50,
    offset: int = 0,
    status: Optional[WorkflowStatus] = None,
    project_id: Optional[str] = None,
    generation_type: Optional[GenerationType] = None
):
    """
    List advanced generations with filtering options
    """
    
    generations = list(advanced_generation_store.values())
    
    # Apply filters
    if status:
        generations = [g for g in generations if g["status"] == status]
    if project_id:
        generations = [g for g in generations if g["project_id"] == project_id]
    if generation_type:
        generations = [g for g in generations if g["request"]["generation_type"] == generation_type]
    
    # Sort by creation time (newest first)
    generations.sort(key=lambda x: x["created_at"], reverse=True)
    
    # Apply pagination
    total = len(generations)
    generations = generations[offset:offset + limit]
    
    return {
        "generations": [
            {
                "generation_id": g["generation_id"],
                "project_id": g["project_id"],
                "status": g["status"],
                "generation_type": g["request"]["generation_type"],
                "quality_level": g["request"]["quality_level"],
                "progress": g["progress"],
                "created_at": g["created_at"],
                "completed_at": g["completed_at"]
            }
            for g in generations
        ],
        "total": total,
        "limit": limit,
        "offset": offset
    }

@router.get("/generation/analytics/{generation_id}")
async def get_generation_analytics(generation_id: str):
    """
    Get detailed analytics for a completed generation
    """
    
    if generation_id not in advanced_generation_store:
        raise HTTPException(status_code=404, detail="Generation not found")
    
    record = advanced_generation_store[generation_id]
    
    if record["status"] != WorkflowStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Generation not completed yet")
    
    analytics = record.get("analytics", {})
    metadata = record.get("metadata", {})
    
    # Enhanced analytics calculation
    workflow_duration = 0
    if record["completed_at"] and record["created_at"]:
        workflow_duration = (record["completed_at"] - record["created_at"]).total_seconds()
    
    step_analytics = []
    for step in record["workflow_steps"]:
        if step.get("duration"):
            step_analytics.append({
                "step_name": step["step_name"],
                "duration": step["duration"],
                "percentage": (step["duration"] / workflow_duration * 100) if workflow_duration > 0 else 0
            })
    
    return {
        "generation_id": generation_id,
        "analytics": analytics,
        "performance": {
            "total_duration": workflow_duration,
            "models_used": metadata.get("models_used", []),
            "total_tokens": metadata.get("total_tokens", 0),
            "step_breakdown": step_analytics
        },
        "quality_metrics": analytics.get("quality_metrics", {}),
        "content_metrics": analytics.get("content_metrics", {})
    }

# Background processing function
async def process_advanced_generation(
    generation_id: str,
    request: AdvancedGenerationRequest,
    model_manager: ModelManager,
    service_comm: ServiceCommunication
):
    """
    Process advanced generation with full workflow tracking
    """
    
    logger.info("🔄 [DEBUG] ===== AI ENGINE PROCESSING START =====")
    logger.info("🔄 [DEBUG] Processing generation:", generation_id=generation_id)
    logger.info("🔄 [DEBUG] Project ID:", project_id=request.project_id)
    
    start_time = time.time()
    record = advanced_generation_store[generation_id]
    
    try:
        # Step 1: Initialize
        logger.info("📋 [DEBUG] Step 1: Initialization")
        await update_workflow_step(generation_id, "initialization", WorkflowStatus.INITIALIZING, 5.0)
        
        # Validate models and get project context
        logger.info("🤖 [DEBUG] Getting model for content generation")
        model_name = await model_manager.get_model_for_task("content_generation")
        logger.info("🤖 [DEBUG] Model selected:", model_name=model_name)
        
        logger.info("🤖 [DEBUG] Ensuring model availability")
        await model_manager.ensure_model_available(model_name)
        logger.info("✅ [DEBUG] Model is available")
        
        # Step 2: Analysis
        logger.info("📋 [DEBUG] Step 2: Analysis")
        await update_workflow_step(generation_id, "analysis", "running", 15.0)
        
        # Analyze business context and requirements
        logger.info("🔍 [DEBUG] Starting requirement analysis")
        analysis_result = await analyze_generation_requirements(
            request, model_name, model_manager
        )
        logger.info("🔍 [DEBUG] Analysis completed:", analysis_result=bool(analysis_result))
        
        await complete_workflow_step(generation_id, "analysis", analysis_result)
        
        # Step 3: Content Generation
        logger.info("📋 [DEBUG] Step 3: Content Generation")
        await update_workflow_step(generation_id, "content_generation", "running", 50.0)
        
        logger.info("✍️ [DEBUG] Starting content generation")
        generation_result = await generate_advanced_content(
            request, analysis_result, model_name, model_manager
        )
        logger.info("✍️ [DEBUG] Content generation completed:", content_pages=len(generation_result.get('pages', {})))
        
        await complete_workflow_step(generation_id, "content_generation", generation_result)
        
        # Step 4: Optimization
        logger.info("📋 [DEBUG] Step 4: Optimization")
        await update_workflow_step(generation_id, "optimization", "running", 80.0)
        
        logger.info("⚡ [DEBUG] Starting content optimization")
        optimization_result = await optimize_generated_content(
            generation_result, request, model_name, model_manager
        )
        logger.info("⚡ [DEBUG] Optimization completed")
        
        await complete_workflow_step(generation_id, "optimization", optimization_result)
        
        await complete_workflow_step(generation_id, "optimization", optimization_result)
        
        # Step 5: Analytics (if requested)
        if request.include_analytics:
            await update_workflow_step(generation_id, "analytics", "running", 90.0)
            
            analytics_result = await generate_content_analytics(
                optimization_result, request
            )
            
            record["analytics"] = analytics_result
            await complete_workflow_step(generation_id, "analytics", analytics_result)
        
        # Step 6: Finalization
        await update_workflow_step(generation_id, "finalization", "running", 95.0)
        
        # Store final content
        record["content"] = optimization_result
        record["metadata"]["models_used"] = [model_name]
        record["metadata"]["generation_time"] = time.time() - start_time
        
        # Complete generation
        record["status"] = WorkflowStatus.COMPLETED
        record["completed_at"] = datetime.utcnow()
        record["progress"] = 100.0
        record["current_step"] = "completed"
        
        await complete_workflow_step(generation_id, "finalization", {"status": "completed"})
        
        logger.info(
            f"Advanced generation completed",
            generation_id=generation_id,
            duration=f"{time.time() - start_time:.2f}s"
        )
        
        # Backend notifications
        if request.auto_notify_backend:
            await notify_backend_completion(generation_id, request, record, service_comm)
        
        # Hugo generation request
        if request.request_hugo_generation:
            await request_hugo_site_generation(generation_id, request, record, service_comm)
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Advanced generation failed: {error_msg}")
        
        record["status"] = WorkflowStatus.FAILED
        record["error"] = error_msg
        record["completed_at"] = datetime.utcnow()
        
        # Mark current step as failed
        if record["workflow_steps"]:
            record["workflow_steps"][-1]["status"] = "failed"
            record["workflow_steps"][-1]["error"] = error_msg
            record["workflow_steps"][-1]["completed_at"] = datetime.utcnow()

# Workflow helper functions
async def update_workflow_step(generation_id: str, step_name: str, status: str, progress: float):
    """Update workflow step status"""
    record = advanced_generation_store[generation_id]
    
    # Complete previous step if exists
    if record["workflow_steps"] and record["workflow_steps"][-1]["status"] == "running":
        record["workflow_steps"][-1]["status"] = "completed"
        record["workflow_steps"][-1]["completed_at"] = datetime.utcnow()
    
    # Add new step
    step = {
        "step_name": step_name,
        "status": status,
        "started_at": datetime.utcnow(),
        "completed_at": None,
        "duration": None,
        "output": None,
        "error": None
    }
    
    record["workflow_steps"].append(step)
    record["current_step"] = step_name
    record["progress"] = progress

async def complete_workflow_step(generation_id: str, step_name: str, output: Dict[str, Any]):
    """Complete a workflow step"""
    record = advanced_generation_store[generation_id]
    
    if record["workflow_steps"] and record["workflow_steps"][-1]["step_name"] == step_name:
        step = record["workflow_steps"][-1]
        step["status"] = "completed"
        step["completed_at"] = datetime.utcnow()
        step["output"] = output
        
        if step["started_at"]:
            step["duration"] = (step["completed_at"] - step["started_at"]).total_seconds()

# Content generation functions (simplified for example)
async def analyze_generation_requirements(request, model_name, model_manager):
    """Analyze generation requirements"""
    # This would contain sophisticated analysis logic
    return {
        "content_strategy": "analyzed",
        "target_keywords": ["business", "professional"],
        "tone_analysis": request.content_requirements.get("tone", "professional")
    }

async def generate_advanced_content(request, analysis, model_name, model_manager):
    """Generate advanced content based on analysis"""
    # This would contain the actual content generation logic
    return {
        "pages": {
            "home": {"title": "Welcome", "content": "Generated content..."},
            "about": {"title": "About Us", "content": "Generated content..."}
        }
    }

async def optimize_generated_content(content, request, model_name, model_manager):
    """Optimize generated content"""
    # This would contain content optimization logic
    return content

async def generate_content_analytics(content, request):
    """Generate content analytics"""
    return {
        "quality_metrics": {"readability": 85, "seo_score": 90},
        "content_metrics": {"word_count": 1500, "keyword_density": 2.5}
    }

async def notify_backend_completion(generation_id, request, record, service_comm):
    """Notify backend of completion"""
    try:
        await service_comm.notify_backend_generation_completed(
            project_id=request.project_id,
            generation_id=generation_id,
            content=record["content"],
            user_id=request.user_id
        )
        record["backend_notified"] = True
    except Exception as e:
        logger.warning(f"Failed to notify backend: {e}")

async def request_hugo_site_generation(generation_id, request, record, service_comm):
    """Request Hugo site generation"""
    try:
        await service_comm.request_hugo_generation(
            project_data=request.business_context,
            content=record["content"],
            generation_id=generation_id
        )
        record["hugo_generation_requested"] = True
    except Exception as e:
        logger.warning(f"Failed to request Hugo generation: {e}")