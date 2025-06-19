"""
Content Generation API Endpoints
Handles website content generation requests with proper communication patterns
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends, Request
from pydantic import BaseModel, Field, validator
from typing import Dict, Any, Optional, List, Union
import uuid
import asyncio
import time
from datetime import datetime
from enum import Enum
import structlog

from ..services.ollama_client import OllamaClient
from ..services.model_manager import ModelManager
from ..services.service_communication import ServiceCommunication
from ..config import settings, MODEL_PRESETS

logger = structlog.get_logger()
router = APIRouter()

# Request/Response Models
class ContentTone(str, Enum):
    PROFESSIONAL = "professional"
    CASUAL = "casual"
    FRIENDLY = "friendly"
    FORMAL = "formal"
    CREATIVE = "creative"
    AUTHORITATIVE = "authoritative"
    CONVERSATIONAL = "conversational"
    TECHNICAL = "technical"

class ContentLength(str, Enum):
    SHORT = "short"
    MEDIUM = "medium"
    LONG = "long"
    DETAILED = "detailed"

class GenerationStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class ContentGenerationRequest(BaseModel):
    """Request model for content generation"""
    business_name: str = Field(..., description="Business name", min_length=1, max_length=100)
    business_type: str = Field(..., description="Type of business", min_length=1, max_length=50)
    industry: Optional[str] = Field(None, description="Industry sector", max_length=50)
    description: Optional[str] = Field(None, description="Business description", max_length=500)
    target_audience: Optional[str] = Field(None, description="Target audience", max_length=200)
    pages: List[str] = Field(
        default=["home", "about", "services", "contact"], 
        description="Pages to generate"
    )
    tone: ContentTone = Field(default=ContentTone.PROFESSIONAL, description="Content tone")
    length: ContentLength = Field(default=ContentLength.MEDIUM, description="Content length")
    include_seo: bool = Field(default=True, description="Include SEO optimization")
    model: Optional[str] = Field(None, description="Specific model to use")
    project_id: Optional[str] = Field(None, description="Associated project ID")
    user_id: Optional[str] = Field(None, description="User ID for tracking")
    
    @validator('pages')
    def validate_pages(cls, v):
        allowed_pages = ["home", "about", "services", "contact", "portfolio", "blog", "testimonials"]
        for page in v:
            if page not in allowed_pages:
                raise ValueError(f"Invalid page type: {page}")
        return v

class PageContent(BaseModel):
    """Content for a single page"""
    title: str = Field(..., description="Page title")
    content: str = Field(..., description="Page content in Markdown")
    meta_description: str = Field(..., description="SEO meta description")
    keywords: List[str] = Field(default=[], description="SEO keywords")
    seo_title: Optional[str] = Field(None, description="SEO optimized title")
    slug: str = Field(..., description="URL slug")

class ContentGenerationResponse(BaseModel):
    """Response model for content generation"""
    generation_id: str = Field(..., description="Unique generation ID")
    status: GenerationStatus = Field(..., description="Generation status")
    pages: Dict[str, PageContent] = Field(default={}, description="Generated page content")
    metadata: Dict[str, Any] = Field(default={}, description="Generation metadata")
    created_at: datetime = Field(..., description="Creation timestamp")
    completed_at: Optional[datetime] = Field(None, description="Completion timestamp")
    error: Optional[str] = Field(None, description="Error message if failed")

class GenerationStatusResponse(BaseModel):
    """Response model for generation status"""
    generation_id: str = Field(..., description="Generation ID")
    status: GenerationStatus = Field(..., description="Current status")
    progress: float = Field(default=0.0, description="Progress percentage (0-100)")
    current_step: Optional[str] = Field(None, description="Current processing step")
    estimated_completion: Optional[datetime] = Field(None, description="Estimated completion time")
    pages_completed: int = Field(default=0, description="Number of pages completed")
    total_pages: int = Field(default=0, description="Total number of pages")

# In-memory storage for generation status (in production, use Redis or database)
generation_store: Dict[str, Dict[str, Any]] = {}

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

@router.post("/content/generate-content", response_model=ContentGenerationResponse)
async def generate_content(
    request: ContentGenerationRequest,
    background_tasks: BackgroundTasks,
    http_request: Request,
    model_manager: ModelManager = Depends(get_model_manager),
    service_comm: ServiceCommunication = Depends(get_service_communication)
):
    """
    Generate website content based on business information
    """
    
    # Generate unique ID for this generation
    generation_id = str(uuid.uuid4())
    request_id = getattr(http_request.state, 'request_id', 'unknown')
    
    logger.info(
        "Content generation requested",
        generation_id=generation_id,
        request_id=request_id,
        business_name=request.business_name,
        pages=request.pages,
        tone=request.tone
    )
    
    # Initialize generation record
    generation_record = {
        "generation_id": generation_id,
        "status": GenerationStatus.QUEUED,
        "request": request.dict(),
        "pages": {},
        "metadata": {
            "request_id": request_id,
            "model_used": None,
            "generation_time": None,
            "created_at": datetime.utcnow(),
            "progress": 0.0
        },
        "created_at": datetime.utcnow(),
        "completed_at": None,
        "error": None
    }
    
    generation_store[generation_id] = generation_record
    
    # Notify backend if project_id is provided
    if request.project_id and service_comm:
        try:
            await service_comm.notify_backend_generation_started(
                project_id=request.project_id,
                generation_id=generation_id,
                user_id=request.user_id
            )
        except Exception as e:
            logger.warning(f"Failed to notify backend: {e}")
    
    # Start background generation
    background_tasks.add_task(
        process_content_generation,
        generation_id,
        request,
        model_manager,
        service_comm
    )
    
    return ContentGenerationResponse(
        generation_id=generation_id,
        status=GenerationStatus.QUEUED,
        pages={},
        metadata=generation_record["metadata"],
        created_at=generation_record["created_at"]
    )

@router.get("/content/status/{generation_id}", response_model=GenerationStatusResponse)
async def get_generation_status(generation_id: str):
    """
    Get the status of a content generation request
    """
    
    if generation_id not in generation_store:
        raise HTTPException(status_code=404, detail="Generation not found")
    
    record = generation_store[generation_id]
    
    return GenerationStatusResponse(
        generation_id=generation_id,
        status=record["status"],
        progress=record["metadata"].get("progress", 0.0),
        current_step=record["metadata"].get("current_step"),
        estimated_completion=record["metadata"].get("estimated_completion"),
        pages_completed=len(record["pages"]),
        total_pages=len(record["request"]["pages"])
    )

@router.get("/content/result/{generation_id}", response_model=ContentGenerationResponse)
async def get_generation_result(generation_id: str):
    """
    Get the result of a completed content generation
    """
    
    if generation_id not in generation_store:
        raise HTTPException(status_code=404, detail="Generation not found")
    
    record = generation_store[generation_id]
    
    return ContentGenerationResponse(
        generation_id=generation_id,
        status=record["status"],
        pages=record["pages"],
        metadata=record["metadata"],
        created_at=record["created_at"],
        completed_at=record["completed_at"],
        error=record["error"]
    )

@router.delete("/content/{generation_id}")
async def delete_generation(generation_id: str):
    """
    Delete a generation record
    """
    
    if generation_id not in generation_store:
        raise HTTPException(status_code=404, detail="Generation not found")
    
    del generation_store[generation_id]
    
    return {
        "success": True,
        "message": f"Generation {generation_id} deleted successfully"
    }

@router.get("/content/generations")
async def list_generations(
    limit: int = 50,
    offset: int = 0,
    status: Optional[GenerationStatus] = None
):
    """
    List content generations with optional filtering
    """
    
    generations = list(generation_store.values())
    
    # Filter by status if provided
    if status:
        generations = [g for g in generations if g["status"] == status]
    
    # Sort by creation time (newest first)
    generations.sort(key=lambda x: x["created_at"], reverse=True)
    
    # Apply pagination
    total = len(generations)
    generations = generations[offset:offset + limit]
    
    return {
        "generations": [
            {
                "generation_id": g["generation_id"],
                "status": g["status"],
                "business_name": g["request"]["business_name"],
                "pages": len(g["pages"]),
                "created_at": g["created_at"],
                "completed_at": g["completed_at"]
            }
            for g in generations
        ],
        "total": total,
        "limit": limit,
        "offset": offset
    }

async def process_content_generation(
    generation_id: str,
    request: ContentGenerationRequest,
    model_manager: ModelManager,
    service_comm: ServiceCommunication
):
    """
    Background task to process content generation
    """
    
    start_time = time.time()
    
    try:
        # Update status to processing
        generation_store[generation_id]["status"] = GenerationStatus.PROCESSING
        generation_store[generation_id]["metadata"]["current_step"] = "Initializing"
        generation_store[generation_id]["metadata"]["progress"] = 5.0
        
        logger.info(f"Starting content generation for {generation_id}")
        
        # Get appropriate model for content generation
        model_name = request.model or await model_manager.get_model_for_task("content_generation")
        
        # Ensure model is available
        model_available = await model_manager.ensure_model_available(model_name)
        if not model_available:
            raise Exception(f"Model {model_name} is not available")
        
        generation_store[generation_id]["metadata"]["model_used"] = model_name
        generation_store[generation_id]["metadata"]["current_step"] = "Generating content"
        generation_store[generation_id]["metadata"]["progress"] = 10.0
        
        # Generate content for each page
        pages_content = {}
        total_pages = len(request.pages)
        
        for i, page_name in enumerate(request.pages):
            logger.info(f"Generating content for page: {page_name}")
            
            # Update progress
            progress = 10.0 + (i / total_pages) * 80.0
            generation_store[generation_id]["metadata"]["progress"] = progress
            generation_store[generation_id]["metadata"]["current_step"] = f"Generating {page_name} page"
            
            # Generate page content
            page_content = await generate_page_content(
                page_name=page_name,
                request=request,
                model_name=model_name,
                model_manager=model_manager
            )
            
            pages_content[page_name] = page_content
            generation_store[generation_id]["pages"][page_name] = page_content
        
        # Mark as completed
        generation_time = time.time() - start_time
        generation_store[generation_id]["status"] = GenerationStatus.COMPLETED
        generation_store[generation_id]["completed_at"] = datetime.utcnow()
        generation_store[generation_id]["metadata"]["progress"] = 100.0
        generation_store[generation_id]["metadata"]["current_step"] = "Completed"
        generation_store[generation_id]["metadata"]["generation_time"] = generation_time
        
        logger.info(
            f"Content generation completed for {generation_id}",
            generation_time=f"{generation_time:.2f}s",
            pages_generated=len(pages_content)
        )
        
        # Record model usage
        model_manager.record_model_usage(model_name, generation_time, True)
        
        # Notify backend if project_id is provided
        if request.project_id and service_comm:
            try:
                await service_comm.notify_backend_generation_completed(
                    project_id=request.project_id,
                    generation_id=generation_id,
                    content=pages_content,
                    user_id=request.user_id
                )
            except Exception as e:
                logger.warning(f"Failed to notify backend of completion: {e}")
    
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Content generation failed for {generation_id}: {error_msg}")
        
        # Mark as failed
        generation_store[generation_id]["status"] = GenerationStatus.FAILED
        generation_store[generation_id]["error"] = error_msg
        generation_store[generation_id]["completed_at"] = datetime.utcnow()
        generation_store[generation_id]["metadata"]["current_step"] = "Failed"
        
        # Record model usage failure
        if "model_used" in generation_store[generation_id]["metadata"]:
            model_name = generation_store[generation_id]["metadata"]["model_used"]
            model_manager.record_model_usage(model_name, time.time() - start_time, False)
        
        # Notify backend of failure
        if request.project_id and service_comm:
            try:
                await service_comm.notify_backend_generation_failed(
                    project_id=request.project_id,
                    generation_id=generation_id,
                    error=error_msg,
                    user_id=request.user_id
                )
            except Exception as notify_error:
                logger.warning(f"Failed to notify backend of failure: {notify_error}")

async def generate_page_content(
    page_name: str,
    request: ContentGenerationRequest,
    model_name: str,
    model_manager: ModelManager
) -> PageContent:
    """
    Generate content for a specific page
    """
    
    # Get Ollama client
    from main import app
    ollama_client = app.state.ollama_client
    
    # Create page-specific prompt
    prompt = create_page_prompt(page_name, request)
    system_prompt = create_system_prompt(request.tone, request.length, request.include_seo)
    
    # Generate content
    preset = MODEL_PRESETS.get("content_generation", {})
    response = await ollama_client.generate(
        model=model_name,
        prompt=prompt,
        system_prompt=system_prompt,
        temperature=preset.get("temperature", 0.7),
        max_tokens=preset.get("max_tokens", 2000),
        top_p=preset.get("top_p", 0.9)
    )
    
    content = response.get("response", "")
    
    # Parse and structure the content
    return parse_generated_content(page_name, content, request)

def create_page_prompt(page_name: str, request: ContentGenerationRequest) -> str:
    """Create a page-specific prompt for content generation"""
    
    business_name = request.business_name
    business_type = request.business_type
    industry = request.industry or "general business"
    description = request.description or f"Professional {business_type} business"
    target_audience = request.target_audience or "businesses and individuals"
    tone = request.tone.value
    length = request.length.value
    
    prompts = {
        "home": f"""Create a compelling homepage for {business_name}, a {business_type} business in the {industry} industry.

Business Description: {description}
Target Audience: {target_audience}
Tone: {tone}
Length: {length}

Include:
1. Engaging headline that captures what the business does
2. Brief overview of services/products
3. Value proposition and unique selling points
4. Call-to-action sections
5. Why choose us section
6. Contact information placeholder

Format as clean Markdown with appropriate headers.""",

        "about": f"""Write a comprehensive About page for {business_name}.

Business Details:
- Type: {business_type}
- Industry: {industry}
- Description: {description}
- Target Audience: {target_audience}

Content Requirements:
- Tone: {tone}
- Length: {length}
- Include company story and mission
- Add values and vision
- Mention team expertise
- Explain why customers should choose us
- Format in Markdown

Structure:
# About {business_name}
## Our Story
## Mission & Vision
## Our Values
## Our Team
## Why Choose Us

Make it personal and trustworthy.""",

        "services": f"""Create a comprehensive Services page for {business_name}.

Business Details:
- Type: {business_type}
- Industry: {industry}
- Target Audience: {target_audience}

Content Requirements:
- Tone: {tone}
- Length: {length}
- List 4-6 main service categories
- Include detailed descriptions for each service
- Add benefits and features
- Include pricing approach (general)
- Add call-to-action for each service
- Format in Markdown

Structure:
# Our Services
## Service Category 1
## Service Category 2
## Service Category 3
## Get Started

Focus on benefits over features.""",

        "contact": f"""Write a Contact page for {business_name}.

Business Details:
- Type: {business_type}
- Industry: {industry}

Content Requirements:
- Tone: {tone}
- Length: {length}
- Include contact information placeholders
- Add business hours
- Include location information
- Add contact form description
- Include multiple contact methods
- Add response time expectations
- Format in Markdown

Structure:
# Contact {business_name}
## Get In Touch
## Contact Information
## Business Hours
## Our Location
## What Happens Next

Make it welcoming and helpful."""
    }
    
    return prompts.get(page_name, f"Create a {page_name} page for {business_name}, a {business_type} business. Use {tone} tone and {length} length.")

def create_system_prompt(tone: ContentTone, length: ContentLength, include_seo: bool) -> str:
    """Create system prompt based on requirements"""
    
    base_prompt = """You are a professional web content writer specializing in business websites. Create engaging, conversion-focused content that matches the specified tone and length requirements."""
    
    tone_instructions = {
        ContentTone.PROFESSIONAL: "Use formal, business-appropriate language with industry expertise.",
        ContentTone.CASUAL: "Write in a relaxed, approachable style that feels conversational.",
        ContentTone.FRIENDLY: "Use warm, welcoming language that builds trust and connection.",
        ContentTone.FORMAL: "Maintain traditional, authoritative communication style.",
        ContentTone.CREATIVE: "Be expressive and artistic, showing personality and innovation.",
        ContentTone.AUTHORITATIVE: "Write with confidence and expertise, establishing credibility.",
        ContentTone.CONVERSATIONAL: "Write as if speaking directly to the reader in natural dialogue.",
        ContentTone.TECHNICAL: "Use precise, industry-specific terminology and detailed explanations."
    }
    
    length_instructions = {
        ContentLength.SHORT: "Keep content concise - 200-400 words per section.",
        ContentLength.MEDIUM: "Write moderate length content - 400-800 words per section.",
        ContentLength.LONG: "Create comprehensive content - 800-1200 words per section.",
        ContentLength.DETAILED: "Write in-depth, thorough content - 1200+ words per section."
    }
    
    seo_instruction = "\nOptimize for SEO with natural keyword integration, meta descriptions, and search-friendly structure." if include_seo else ""
    
    return f"{base_prompt}\n\n{tone_instructions[tone]}\n\n{length_instructions[length]}{seo_instruction}\n\nAlways format content in clean Markdown with proper headers and structure."

def parse_generated_content(page_name: str, content: str, request: ContentGenerationRequest) -> PageContent:
    """Parse generated content and extract structured information"""
    
    # Extract title (first # header)
    lines = content.split('\n')
    title = request.business_name
    for line in lines:
        if line.startswith('# '):
            title = line[2:].strip()
            break
    
    # Generate SEO-friendly slug
    slug = page_name.lower().replace(' ', '-')
    
    # Extract or generate meta description
    meta_description = f"{request.business_name} - {request.business_type} business"
    if request.description:
        meta_description = request.description[:160]
    
    # Generate keywords
    keywords = [
        request.business_name.lower(),
        request.business_type.lower(),
        page_name
    ]
    if request.industry:
        keywords.append(request.industry.lower())
    
    # Generate SEO title
    seo_title = f"{title} | {request.business_name}"
    
    return PageContent(
        title=title,
        content=content,
        meta_description=meta_description,
        keywords=keywords,
        seo_title=seo_title,
        slug=slug
    )