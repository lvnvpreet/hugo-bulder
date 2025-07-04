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
from ..services.healthcare_content_service import HealthcareContentService
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

# Healthcare Content Generation Endpoints

async def get_healthcare_service() -> HealthcareContentService:
    """Dependency to get healthcare content service"""
    from main import app
    ollama_client = app.state.ollama_client
    model_manager = app.state.model_manager
    return HealthcareContentService(ollama_client, model_manager)

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
    
    logger.info("🎯 [DEBUG] ===== CONTENT GENERATION ENDPOINT HIT =====")
    logger.info("🎯 [DEBUG] Request received at /content/generate-content")
    logger.info("🎯 [DEBUG] HTTP method:", method=http_request.method)
    logger.info("🎯 [DEBUG] Request headers:", headers=dict(http_request.headers))
    logger.info("🎯 [DEBUG] Request client:", client=http_request.client)
    
    # Log the incoming request for debugging
    logger.info("=== INCOMING CONTENT GENERATION REQUEST ===")
    logger.info("📋 [DEBUG] Request validation status: SUCCESS")
    logger.info("📋 [DEBUG] Business name:", business_name=request.business_name, type=type(request.business_name).__name__)
    logger.info("📋 [DEBUG] Business type:", business_type=request.business_type, type=type(request.business_type).__name__)
    logger.info("📋 [DEBUG] Tone:", tone=request.tone, type=type(request.tone).__name__)
    logger.info("📋 [DEBUG] Length:", length=request.length, type=type(request.length).__name__)
    logger.info("📋 [DEBUG] Pages:", pages=request.pages, type=type(request.pages).__name__, count=len(request.pages) if hasattr(request.pages, '__len__') else 'unknown')
    logger.info("📋 [DEBUG] Description:", description=getattr(request, 'description', 'not provided'))
    logger.info("📋 [DEBUG] Contact info:", contact_info=getattr(request, 'contact_info', 'not provided'))
    
    logger.info(f"Request validated successfully")
    logger.info(f"business_name: {request.business_name} (type: {type(request.business_name)})")
    logger.info(f"tone: {request.tone} (type: {type(request.tone)})")
    logger.info(f"length: {request.length} (type: {type(request.length)})")
    logger.info(f"pages: {request.pages} (type: {type(request.pages)})")
    
    # Generate unique ID for this generation
    generation_id = str(uuid.uuid4())
    request_id = getattr(http_request.state, 'request_id', 'unknown')
    
    logger.info("🔍 [DEBUG] Generation identifiers created:")
    logger.info("🔍 [DEBUG] Generation ID:", generation_id=generation_id)
    logger.info("🔍 [DEBUG] Request ID:", request_id=request_id)
    
    logger.info(
        "Content generation requested",
        generation_id=generation_id,
        request_id=request_id,
        business_name=request.business_name,
        pages=request.pages,
        tone=request.tone
    )      # Initialize generation record
    logger.info("📝 [DEBUG] Creating generation record")
    try:
        logger.info("📝 [DEBUG] Converting request to dictionary")
        request_dict = request.dict()
        logger.info("✅ [DEBUG] Successfully converted request to dict:", keys=list(request_dict.keys()))
        logger.info("📝 [DEBUG] Request dict content:", request_dict=request_dict)
    except Exception as dict_error:
        logger.error("❌ [DEBUG] Error converting request to dict:", error=str(dict_error), exc_info=True)
        # Create a safe fallback dict
        logger.info("🔄 [DEBUG] Creating fallback dictionary")
        request_dict = {
            "business_name": getattr(request, 'business_name', 'Unknown'),
            "business_type": getattr(request, 'business_type', 'Unknown'),
            "pages": getattr(request, 'pages', ['home']),
            "tone": str(getattr(request, 'tone', 'professional')),
            "length": str(getattr(request, 'length', 'medium'))
        }
        logger.info("✅ [DEBUG] Fallback dictionary created:", fallback_dict=request_dict)
    
    logger.info("📝 [DEBUG] Creating generation record structure")
    generation_record = {
        "generation_id": generation_id,
        "status": "queued",  # Use string directly instead of enum
        "request": request_dict,
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
    logger.info("✅ [DEBUG] Generation record created successfully:", record_id=generation_record["generation_id"])
    
    logger.info("💾 [DEBUG] Storing generation record in memory store")
    generation_store[generation_id] = generation_record
    logger.info("✅ [DEBUG] Generation record stored, store size:", store_size=len(generation_store))
    
    # Notify backend if project_id is provided
    if request.project_id and service_comm:
        try:
            logger.info("📡 [DEBUG] Notifying backend of generation start:", project_id=request.project_id)
            await service_comm.notify_backend_generation_started(
                project_id=request.project_id,
                generation_id=generation_id,
                user_id=request.user_id
            )
            logger.info("✅ [DEBUG] Backend notification sent successfully")
        except Exception as e:
            logger.error("❌ [DEBUG] Failed to notify backend:", error=str(e), exc_info=True)
            logger.warning(f"Failed to notify backend: {e}")
    else:
        logger.info("⚠️ [DEBUG] Skipping backend notification:", has_project_id=bool(request.project_id), has_service_comm=bool(service_comm))
        
      # Start background generation
    try:
        logger.info("🚀 [DEBUG] Starting background content generation task")
        logger.info("🚀 [DEBUG] Task parameters:", generation_id=generation_id, business_name=request.business_name)
        logger.info(f"About to start background task for {generation_id}")
        
        background_tasks.add_task(
            process_content_generation,
            generation_id,
            request,
            model_manager,
            service_comm
        )
        logger.info("✅ [DEBUG] Background task added successfully")
        logger.info(f"Background task started successfully for {generation_id}")
    except Exception as bg_error:
        logger.error("❌ [DEBUG] Failed to start background task:", error=str(bg_error), exc_info=True)
        logger.error(f"Failed to start background task: {bg_error}")
        # Mark generation as failed
        logger.info("🔄 [DEBUG] Marking generation as failed in store")
        generation_store[generation_id]["status"] = "failed"
        generation_store[generation_id]["error"] = f"Failed to start generation: {str(bg_error)}"
    
    logger.info("📤 [DEBUG] Preparing response for client")
    response_data = ContentGenerationResponse(
        generation_id=generation_id,
        status="queued",
        pages={},
        metadata=generation_record["metadata"],
        created_at=generation_record["created_at"]
    )
    
    logger.info("✅ [DEBUG] Response created successfully:", response_generation_id=response_data.generation_id)
    logger.info("🎯 [DEBUG] ===== CONTENT GENERATION ENDPOINT RESPONSE =====")
    
    return response_data

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
        logger.info(f"=== STARTING CONTENT GENERATION FOR {generation_id} ===")
        logger.info(f"Request type: {type(request)}")
        logger.info(f"Request business_name: {request.business_name}")
        logger.info(f"Request tone: {request.tone} (type: {type(request.tone)})")
        logger.info(f"Request length: {request.length} (type: {type(request.length)})")
        logger.info(f"Request pages: {request.pages}")
          # Update status to processing
        generation_store[generation_id]["status"] = "processing"
        generation_store[generation_id]["metadata"]["current_step"] = "Initializing"
        generation_store[generation_id]["metadata"]["progress"] = 5.0
        
        logger.info(f"Starting content generation for {generation_id}")
        
        # Get appropriate model for content generation
        try:
            model_name = request.model or await model_manager.get_model_for_task("content_generation")
            logger.info(f"Selected model for content generation: {model_name}")
        except Exception as model_error:
            logger.error(f"Failed to get model for content generation: {model_error}")
            # Fallback to first available model
            available_models = await model_manager.get_available_models()
            if not available_models:
                raise Exception("No models available for content generation")
            model_name = available_models[0].name
            logger.info(f"Using fallback model: {model_name}")
        
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
            try:
                logger.info(f"About to generate content for page: {page_name}")
                page_content = await generate_page_content(
                    page_name=page_name,
                    request=request,
                    model_name=model_name,
                    model_manager=model_manager
                )
                logger.info(f"Successfully generated content for page: {page_name}")
            except Exception as page_error:
                logger.error(f"Error generating content for page {page_name}: {str(page_error)}")
                import traceback
                logger.error(f"Full traceback: {traceback.format_exc()}")
                raise page_error
            
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
                    user_id=request.user_id                )
            except Exception as e:
                logger.warning(f"Failed to notify backend of completion: {e}")
    
    except Exception as e:
        error_msg = str(e)
        import traceback
        full_traceback = traceback.format_exc()
        
        logger.error(f"Content generation failed for {generation_id}: {error_msg}")
        logger.error(f"Full traceback: {full_traceback}")
        
        # Mark as failed with detailed error information
        generation_store[generation_id]["status"] = "failed"
        generation_store[generation_id]["error"] = f"{error_msg} | Traceback: {full_traceback[:500]}..."
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
    Generate content for a specific page using the AI model
    """
    
    logger.info(f"=== GENERATING CONTENT FOR PAGE: {page_name} ===")
    logger.info(f"Using model: {model_name}")
    logger.info(f"Business: {request.business_name} ({request.business_type})")
    
    try:
        # Get the Ollama client from model manager
        ollama_client = model_manager.ollama_client
        
        # Create prompts
        system_prompt = create_system_prompt(request.tone, request.length, request.include_seo)
        page_prompt = create_page_prompt(page_name, request)
        
        logger.info(f"Generated prompts for {page_name}")
        logger.info(f"System prompt length: {len(system_prompt)} chars")
        logger.info(f"Page prompt length: {len(page_prompt)} chars")        # Generate content using Ollama
        logger.info(f"Calling Ollama model {model_name} for content generation...")
        start_time = time.time()
        
        try:
            ollama_response = await ollama_client.generate(
                model=model_name,
                prompt=page_prompt,
                system_prompt=system_prompt,
                temperature=0.7,
                max_tokens=2000
            )
            logger.info(f"✅ Ollama generate call completed successfully")
        except Exception as generate_error:
            logger.error(f"❌ Error in ollama_client.generate: {str(generate_error)}")
            logger.error(f"❌ Error type: {type(generate_error)}")
            raise
        
        generation_time = time.time() - start_time
        logger.info(f"Content generated in {generation_time:.2f}s")
        
        # Debug: Log the actual response from Ollama
        logger.info(f"Ollama response type: {type(ollama_response)}")
        logger.info(f"Ollama response keys: {list(ollama_response.keys()) if isinstance(ollama_response, dict) else 'Not a dict'}")
        if isinstance(ollama_response, dict):
            logger.info(f"Response content preview: {str(ollama_response)[:200]}...")
        
        # Extract the actual content from the Ollama response
        if isinstance(ollama_response, dict) and 'response' in ollama_response:
            generated_content = ollama_response['response']
        else:
            # Handle unexpected response format
            logger.error(f"Unexpected Ollama response format: {type(ollama_response)}")
            logger.error(f"Response content: {ollama_response}")
            raise ValueError(f"Invalid response format from Ollama: {type(ollama_response)}")
        
        logger.info(f"Generated content length: {len(generated_content)} chars")
        
        # Parse and structure the generated content
        parsed_content = parse_generated_content(page_name, generated_content, request)
        
        logger.info(f"Successfully generated and parsed content for {page_name}")
        return parsed_content
        
    except Exception as e:
        logger.error(f"Error generating content for {page_name}: {str(e)}")
        logger.error(f"Falling back to placeholder content")
        
        # Fallback to basic content if AI generation fails
        return PageContent(
            title=f"{request.business_name} - {page_name.title()}",
            content=f"# {request.business_name} - {page_name.title()}\n\nWelcome to our {page_name} page. We are a {request.business_type} business focused on providing excellent service.\n\n## About Our {page_name.title()}\n\n{request.description or 'We are committed to serving our customers with dedication and expertise.'}\n\n## Contact Us\n\nFor more information, please get in touch with us.",
            meta_description=f"{request.business_name} - {request.business_type} business {page_name}",
            keywords=[request.business_name.lower(), request.business_type.lower(), page_name],
            seo_title=f"{page_name.title()} | {request.business_name}",
            slug=page_name.lower()
        )

def create_page_prompt(page_name: str, request: ContentGenerationRequest) -> str:
    """Create a page-specific prompt for content generation"""
    
    business_name = request.business_name
    business_type = request.business_type
    industry = request.industry or "general business"
    description = request.description or f"Professional {business_type} business"
    target_audience = request.target_audience or "businesses and individuals"
    
    # Handle tone and length safely
    if hasattr(request.tone, 'value'):
        tone = request.tone.value
    else:
        tone = str(request.tone)
    
    if hasattr(request.length, 'value'):
        length = request.length.value
    else:
        length = str(request.length)
    
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
    
    length_instructions = {        ContentLength.SHORT: "Keep content concise - 200-400 words per section.",
        ContentLength.MEDIUM: "Write moderate length content - 400-800 words per section.",
        ContentLength.LONG: "Create comprehensive content - 800-1200 words per section.",
        ContentLength.DETAILED: "Write in-depth, thorough content - 1200+ words per section."
    }
    
    seo_instruction = "\nOptimize for SEO with natural keyword integration, meta descriptions, and search-friendly structure." if include_seo else ""
    
    # Handle tone and length parameters safely
    if isinstance(tone, ContentTone):
        tone_key = tone
    else:
        # Try to convert string to enum
        try:
            tone_key = ContentTone(tone)
        except ValueError:
            tone_key = ContentTone.PROFESSIONAL
    
    if isinstance(length, ContentLength):
        length_key = length
    else:
        # Try to convert string to enum
        try:
            length_key = ContentLength(length)
        except ValueError:
            length_key = ContentLength.MEDIUM
    
    tone_instruction = tone_instructions.get(tone_key, tone_instructions[ContentTone.PROFESSIONAL])
    length_instruction = length_instructions.get(length_key, length_instructions[ContentLength.MEDIUM])
    
    return f"{base_prompt}\n\n{tone_instruction}\n\n{length_instruction}{seo_instruction}\n\nAlways format content in clean Markdown with proper headers and structure."

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

# Healthcare-specific request models
class HealthcareContentRequest(BaseModel):
    """Request model for healthcare content generation"""
    business_name: str = Field(..., description="Healthcare practice name", min_length=1, max_length=100)
    subcategory: str = Field(..., description="Healthcare subcategory (dental, medical, veterinary, etc.)", min_length=1, max_length=50)
    content_type: str = Field(..., description="Content type (homepage, about, service_page, contact)", min_length=1, max_length=50)
    business_data: Dict[str, Any] = Field(default={}, description="Additional business information")
    model: Optional[str] = Field(default="llama3.2:3b", description="AI model to use")
    
    @validator('subcategory')
    def validate_subcategory(cls, v):
        allowed_subcategories = ["dental", "medical", "veterinary", "mental_health", "optometry", "dermatology", "chiropractic"]
        if v not in allowed_subcategories:
            raise ValueError(f"Invalid healthcare subcategory: {v}. Allowed: {allowed_subcategories}")
        return v
    
    @validator('content_type')
    def validate_content_type(cls, v):
        allowed_types = ["homepage", "about", "service_page", "contact"]
        if v not in allowed_types:
            raise ValueError(f"Invalid content type: {v}. Allowed: {allowed_types}")
        return v

class HealthcareServiceRequest(BaseModel):
    """Request model for healthcare service page generation"""
    business_name: str = Field(..., description="Healthcare practice name", min_length=1, max_length=100)
    subcategory: str = Field(..., description="Healthcare subcategory", min_length=1, max_length=50)
    service_name: str = Field(..., description="Service name", min_length=1, max_length=100)
    service_data: Dict[str, Any] = Field(default={}, description="Service-specific information")
    model: Optional[str] = Field(default="llama3.2:3b", description="AI model to use")

class HealthcareContentResponse(BaseModel):
    """Response model for healthcare content generation"""
    content: str = Field(..., description="Generated content")
    metadata: Dict[str, Any] = Field(..., description="Content metadata")
    subcategory: str = Field(..., description="Healthcare subcategory")
    content_type: str = Field(..., description="Content type")
    generated_at: str = Field(..., description="Generation timestamp")
    model_used: str = Field(..., description="AI model used")

@router.post("/content/healthcare/generate", response_model=HealthcareContentResponse)
async def generate_healthcare_content(
    request: HealthcareContentRequest,
    healthcare_service: HealthcareContentService = Depends(get_healthcare_service)
):
    """
    Generate healthcare content using specialized prompts from prompts.py
    """
    
    logger.info("🏥 Healthcare content generation requested", 
               business_name=request.business_name, 
               subcategory=request.subcategory, 
               content_type=request.content_type)
    
    try:
        # Generate healthcare content using specialized service
        result = await healthcare_service.generate_healthcare_content(
            business_name=request.business_name,
            subcategory=request.subcategory,
            content_type=request.content_type,
            business_data=request.business_data,
            model_name=request.model
        )
        
        logger.info("✅ Healthcare content generated successfully", 
                   business_name=request.business_name,
                   content_length=len(result["content"]))
        
        return HealthcareContentResponse(**result)
        
    except Exception as e:
        logger.error("❌ Healthcare content generation failed", 
                    business_name=request.business_name, 
                    error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Healthcare content generation failed: {str(e)}"
        )

@router.post("/content/healthcare/service-page")
async def generate_healthcare_service_page(
    request: HealthcareServiceRequest,
    healthcare_service: HealthcareContentService = Depends(get_healthcare_service)
):
    """
    Generate a service page for a healthcare practice
    """
    
    logger.info("🏥 Healthcare service page generation requested", 
               business_name=request.business_name, 
               subcategory=request.subcategory,
               service_name=request.service_name)
    
    try:
        # Generate service page using specialized service
        result = await healthcare_service.generate_service_page(
            business_name=request.business_name,
            subcategory=request.subcategory,
            service_name=request.service_name,
            service_data=request.service_data,
            model_name=request.model
        )
        
        logger.info("✅ Healthcare service page generated successfully", 
                   service_name=request.service_name,
                   content_length=len(result["content"]))
        
        return result
        
    except Exception as e:
        logger.error("❌ Healthcare service page generation failed", 
                    service_name=request.service_name, 
                    error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Healthcare service page generation failed: {str(e)}"
        )

@router.get("/content/healthcare/subcategories")
async def get_supported_healthcare_subcategories(
    healthcare_service: HealthcareContentService = Depends(get_healthcare_service)
):
    """
    Get list of supported healthcare subcategories
    """
    
    try:
        subcategories = healthcare_service.get_supported_subcategories()
        
        return {
            "subcategories": subcategories,
            "count": len(subcategories),
            "description": "Supported healthcare subcategories for Universal Healthcare Theme"
        }
        
    except Exception as e:
        logger.error("❌ Failed to get healthcare subcategories", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get healthcare subcategories: {str(e)}"
        )

@router.post("/content/healthcare/complete-site")
async def generate_complete_healthcare_site(
    business_name: str,
    subcategory: str,
    business_data: Dict[str, Any],
    services: List[Dict[str, Any]],
    model: str = "llama3.2:3b",
    healthcare_service: HealthcareContentService = Depends(get_healthcare_service)
):
    """
    Generate complete healthcare website (homepage, about, contact, service pages)
    """
    
    logger.info("🏥 Complete healthcare site generation requested", 
               business_name=business_name, 
               subcategory=subcategory,
               services_count=len(services))
    
    try:
        site_content = {}
        
        # Generate homepage
        homepage = await healthcare_service.generate_homepage(
            business_name, subcategory, business_data, model
        )
        site_content["homepage"] = homepage
        
        # Generate about page
        about = await healthcare_service.generate_about_page(
            business_name, subcategory, business_data, model
        )
        site_content["about"] = about
        
        # Generate contact page
        contact = await healthcare_service.generate_contact_page(
            business_name, subcategory, business_data, model
        )
        site_content["contact"] = contact
        
        # Generate service pages
        service_pages = []
        for service in services:
            service_page = await healthcare_service.generate_service_page(
                business_name=business_name,
                subcategory=subcategory,
                service_name=service["name"],
                service_data=service,
                model_name=model
            )
            service_pages.append(service_page)
        
        site_content["services"] = service_pages
        
        logger.info("✅ Complete healthcare site generated successfully", 
                   business_name=business_name,
                   pages_count=3 + len(service_pages))
        
        return {
            "business_name": business_name,
            "subcategory": subcategory,
            "site_content": site_content,
            "pages_generated": 3 + len(service_pages),
            "generated_at": datetime.now().isoformat(),
            "model_used": model
        }
        
    except Exception as e:
        logger.error("❌ Complete healthcare site generation failed", 
                    business_name=business_name, 
                    error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Complete healthcare site generation failed: {str(e)}"
        )