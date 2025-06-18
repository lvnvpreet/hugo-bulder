# File: ai-engine/src/api/content.py
# Add this new router to your existing AI engine

"""
Content Generation API Endpoints
FastAPI endpoints for website content generation using Ollama models
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
import uuid
import asyncio
from datetime import datetime
import json

from ..workflows.website_generation import WebsiteGenerationWorkflow
from ..workflows.base import WorkflowState, WorkflowStatus
from ..services.ollama_client import OllamaClient
from ..services.model_manager import ModelManager

router = APIRouter(prefix="/content", tags=["content"])

# Request/Response Models for Website Content Generation
class ContentGenerationRequest(BaseModel):
    business_name: str = Field(..., description="Business name")
    business_type: str = Field(..., description="Type of business")
    industry: Optional[str] = Field(None, description="Industry sector")
    description: Optional[str] = Field(None, description="Business description")
    target_audience: Optional[str] = Field(None, description="Target audience")
    pages: List[str] = Field(default=["home", "about", "services", "contact"], description="Pages to generate")
    tone: str = Field(default="professional", description="Content tone")
    length: str = Field(default="medium", description="Content length")
    include_seo: bool = Field(default=True, description="Include SEO optimization")
    model: Optional[str] = Field(None, description="Specific model to use")

class PageContent(BaseModel):
    title: str
    content: str
    meta_description: str
    keywords: List[str] = []
    seo_title: Optional[str] = None
    word_count: Optional[int] = None

class ContentGenerationResponse(BaseModel):
    pages: Dict[str, PageContent]
    seo_data: Dict[str, Any]
    generation_time: float
    model_used: str
    word_count_total: int
    generation_id: str

# Content generation store (use Redis in production)
content_generation_store: Dict[str, Dict[str, Any]] = {}

# Dependency to get Ollama client
async def get_ollama_client() -> OllamaClient:
    """Get Ollama client from app state"""
    from fastapi import Request
    request = Request.scope
    return request.app.state.ollama_client

async def get_model_manager() -> ModelManager:
    """Get model manager from app state"""
    from fastapi import Request
    request = Request.scope
    return request.app.state.model_manager

@router.post("/generate-content", response_model=ContentGenerationResponse)
async def generate_website_content(
    request: ContentGenerationRequest,
    background_tasks: BackgroundTasks,
    ollama_client: OllamaClient = Depends(get_ollama_client),
    model_manager: ModelManager = Depends(get_model_manager)
):
    """
    Generate complete website content using Ollama models
    """
    generation_id = str(uuid.uuid4())
    start_time = datetime.utcnow()
    
    try:
        # Determine which model to use
        model_name = request.model or "qwen2.5:7b"  # Default model
        
        # Ensure model is available
        available_models = await ollama_client.list_models()
        if model_name not in available_models:
            # Fallback to first available model
            model_name = available_models[0] if available_models else "llama3.1:8b"
        
        print(f"🤖 Using model: {model_name} for content generation")
        
        # Store generation status
        content_generation_store[generation_id] = {
            "status": "generating",
            "progress": 0,
            "started_at": start_time.isoformat(),
            "model": model_name
        }
        
        pages_content = {}
        total_word_count = 0
        
        # Generate content for each page
        for i, page_name in enumerate(request.pages):
            progress = (i + 1) / len(request.pages) * 100
            content_generation_store[generation_id]["progress"] = progress
            content_generation_store[generation_id]["current_page"] = page_name
            
            page_content = await generate_page_content(
                ollama_client=ollama_client,
                page_name=page_name,
                business_name=request.business_name,
                business_type=request.business_type,
                industry=request.industry,
                description=request.description,
                target_audience=request.target_audience,
                tone=request.tone,
                length=request.length,
                model=model_name
            )
            
            pages_content[page_name] = page_content
            total_word_count += page_content.word_count or 0
        
        # Generate SEO data
        seo_data = await generate_seo_data(
            ollama_client=ollama_client,
            request=request,
            model=model_name
        )
        
        # Calculate generation time
        generation_time = (datetime.utcnow() - start_time).total_seconds()
        
        # Update final status
        content_generation_store[generation_id]["status"] = "completed"
        content_generation_store[generation_id]["progress"] = 100
        content_generation_store[generation_id]["completed_at"] = datetime.utcnow().isoformat()
        
        print(f"✅ Content generation completed in {generation_time:.2f}s")
        
        return ContentGenerationResponse(
            pages=pages_content,
            seo_data=seo_data,
            generation_time=generation_time,
            model_used=model_name,
            word_count_total=total_word_count,
            generation_id=generation_id
        )
        
    except Exception as e:
        print(f"❌ Content generation failed: {str(e)}")
        content_generation_store[generation_id]["status"] = "failed"
        content_generation_store[generation_id]["error"] = str(e)
        raise HTTPException(status_code=500, detail=f"Content generation failed: {str(e)}")

@router.get("/generation-status/{generation_id}")
async def get_content_generation_status(generation_id: str):
    """Get status of content generation"""
    if generation_id not in content_generation_store:
        raise HTTPException(status_code=404, detail="Generation not found")
    
    return content_generation_store[generation_id]

async def generate_page_content(
    ollama_client: OllamaClient,
    page_name: str,
    business_name: str,
    business_type: str,
    industry: Optional[str],
    description: Optional[str],
    target_audience: Optional[str],
    tone: str,
    length: str,
    model: str
) -> PageContent:
    """Generate content for a specific page using Ollama"""
    
    # Page-specific prompts optimized for Ollama
    page_prompts = {
        "home": f"""Create a compelling homepage for {business_name}, a {business_type} business.

Business Details:
- Industry: {industry or 'general business'}
- Description: {description or 'Professional services company'}
- Target Audience: {target_audience or 'general public'}

Content Requirements:
- Write in {tone} tone
- Content length: {length}
- Include a hero section with compelling headline
- Add business overview and key value propositions
- Include 3-4 key services or products
- Add a strong call-to-action
- Format in Markdown

Structure:
# [Compelling Headline]
## About {business_name}
## Our Services
## Why Choose Us
## Get Started

Make it engaging and conversion-focused.""",

        "about": f"""Write an engaging About page for {business_name}.

Business Details:
- Type: {business_type}
- Industry: {industry or 'general business'}
- Description: {description or 'Professional business'}

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
- Industry: {industry or 'general business'}
- Target Audience: {target_audience or 'businesses and individuals'}

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
- Industry: {industry or 'general business'}

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
    
    # Get the appropriate prompt
    prompt = page_prompts.get(page_name, f"Create a {page_name} page for {business_name}, a {business_type} business. Use {tone} tone and {length} length.")
    
    try:
        # Generate content using Ollama
        response = await ollama_client.generate(
            model=model,
            prompt=prompt,
            system_prompt="You are a professional web content writer. Create engaging, SEO-optimized content that converts visitors into customers. Always format content in clean Markdown.",
            max_tokens=1500 if length == "long" else 1000 if length == "medium" else 600,
            temperature=0.7
        )
        
        content = response.get("response", "").strip()
        
        # Extract title from content (first # heading)
        lines = content.split('\n')
        title = f"{page_name.title()} - {business_name}"
        for line in lines:
            if line.startswith('# '):
                title = line[2:].strip()
                break
        
        # Count words
        word_count = len(content.split())
        
        # Generate meta description using a separate call
        meta_description = await generate_meta_description(
            ollama_client=ollama_client,
            page_name=page_name,
            business_name=business_name,
            business_type=business_type,
            content_preview=content[:300],
            model=model
        )
        
        # Generate keywords
        keywords = await generate_keywords(
            ollama_client=ollama_client,
            business_name=business_name,
            business_type=business_type,
            industry=industry,
            page_name=page_name,
            model=model
        )
        
        return PageContent(
            title=title,
            content=content,
            meta_description=meta_description,
            keywords=keywords,
            seo_title=f"{title} | {business_name}",
            word_count=word_count
        )
        
    except Exception as e:
        print(f"⚠️ Error generating {page_name} content: {e}")
        # Fallback content
        return PageContent(
            title=f"{page_name.title()} - {business_name}",
            content=f"# {page_name.title()}\n\nWelcome to {business_name}. We provide excellent {business_type} services.\n\nContact us today to learn more about how we can help you achieve your goals.",
            meta_description=f"{business_name} {page_name} page - Professional {business_type} services",
            keywords=[business_name.lower(), page_name, business_type.lower()],
            word_count=25
        )

async def generate_meta_description(
    ollama_client: OllamaClient,
    page_name: str,
    business_name: str,
    business_type: str,
    content_preview: str,
    model: str
) -> str:
    """Generate SEO meta description using Ollama"""
    
    prompt = f"""Create a compelling SEO meta description for the {page_name} page of {business_name}.

Business: {business_name} ({business_type})
Content Preview: {content_preview}

Requirements:
- Exactly 150-160 characters
- Include business name
- Include relevant keywords
- Compelling and action-oriented
- No quotation marks

Just return the meta description, nothing else."""

    try:
        response = await ollama_client.generate(
            model=model,
            prompt=prompt,
            system_prompt="You are an SEO expert. Create concise, compelling meta descriptions that drive clicks.",
            max_tokens=50,
            temperature=0.5
        )
        
        meta_desc = response.get("response", "").strip().replace('"', '').replace("'", "")
        
        # Ensure it's within character limit
        if len(meta_desc) > 160:
            meta_desc = meta_desc[:157] + "..."
        
        return meta_desc
        
    except Exception as e:
        print(f"⚠️ Error generating meta description: {e}")
        return f"{business_name} - Professional {business_type} services. Contact us today for more information."

async def generate_keywords(
    ollama_client: OllamaClient,
    business_name: str,
    business_type: str,
    industry: Optional[str],
    page_name: str,
    model: str
) -> List[str]:
    """Generate SEO keywords using Ollama"""
    
    prompt = f"""Generate 8-10 SEO keywords for the {page_name} page of {business_name}.

Business Details:
- Name: {business_name}
- Type: {business_type}
- Industry: {industry or 'general'}
- Page: {page_name}

Return only the keywords as a comma-separated list, no explanations."""

    try:
        response = await ollama_client.generate(
            model=model,
            prompt=prompt,
            system_prompt="You are an SEO expert. Generate relevant, high-impact keywords for better search rankings.",
            max_tokens=100,
            temperature=0.3
        )
        
        keywords_text = response.get("response", "").strip()
        keywords = [kw.strip().lower() for kw in keywords_text.split(',') if kw.strip()]
        
        # Add basic keywords if generation failed
        if not keywords:
            keywords = [
                business_name.lower(),
                business_type.lower(),
                page_name.lower()
            ]
            if industry:
                keywords.append(industry.lower())
        
        return keywords[:10]  # Limit to 10 keywords
        
    except Exception as e:
        print(f"⚠️ Error generating keywords: {e}")
        return [business_name.lower(), business_type.lower(), page_name.lower()]

async def generate_seo_data(
    ollama_client: OllamaClient,
    request: ContentGenerationRequest,
    model: str
) -> Dict[str, Any]:
    """Generate additional SEO data using Ollama"""
    
    try:
        prompt = f"""Generate SEO data for {request.business_name} website.

Business Details:
- Name: {request.business_name}
- Type: {request.business_type}
- Industry: {request.industry or 'general'}
- Description: {request.description or 'Professional services'}

Generate:
1. Site title (60 chars max)
2. Site description (160 chars max)
3. 5 main keywords
4. Open Graph title
5. Twitter card description

Format as JSON with keys: site_title, site_description, main_keywords, og_title, twitter_description"""

        response = await ollama_client.generate(
            model=model,
            prompt=prompt,
            system_prompt="You are an SEO expert. Generate comprehensive SEO data in valid JSON format.",
            max_tokens=300,
            temperature=0.5
        )
        
        seo_text = response.get("response", "").strip()
        
        # Try to parse JSON response
        try:
            seo_data = json.loads(seo_text)
        except json.JSONDecodeError:
            # Fallback if JSON parsing fails
            seo_data = {}
        
        # Ensure all required fields exist
        fallback_seo = {
            "site_title": request.business_name,
            "site_description": f"{request.business_name} - Professional {request.business_type} services",
            "main_keywords": [request.business_name.lower(), request.business_type.lower()],
            "og_title": request.business_name,
            "twitter_description": f"Professional {request.business_type} services",
            "robots": "index, follow",
            "canonical_url": "https://example.com",
            "og_type": "website",
            "twitter_card": "summary_large_image"
        }
        
        # Merge generated data with fallback
        return {**fallback_seo, **seo_data}
        
    except Exception as e:
        print(f"⚠️ Error generating SEO data: {e}")
        return {
            "site_title": request.business_name,
            "site_description": f"{request.business_name} - Professional {request.business_type} services",
            "main_keywords": [request.business_name.lower(), request.business_type.lower()],
            "robots": "index, follow",
            "og_type": "website"
        }