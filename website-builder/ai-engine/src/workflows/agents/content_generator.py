"""
Content Generator Agent
Generates comprehensive website content for all pages and sections
"""

from typing import Dict, Any, List
import json
from datetime import datetime

from .base_agent import BaseAgent
from ..base import WorkflowState
from ...services.ollama_client import OllamaClient

class ContentGenerator(BaseAgent):
    """Agent for generating comprehensive website content"""
    
    def __init__(self, ollama_client: OllamaClient):
        super().__init__(
            ollama_client=ollama_client,
            model="llama3.1:8b",
            task_type="content_generation"
        )
        
        self.system_prompt = """You are a professional content writer specializing in website copy. 
        Create engaging, SEO-optimized content that converts visitors into customers.
        
        Your content should be:
        - Clear and compelling
        - Benefit-focused rather than feature-focused
        - Written in active voice
        - Optimized for the target audience
        - Structured for easy scanning and reading
        - Conversion-oriented with clear calls to action
        
        Always maintain the brand voice and align with the content strategy provided."""
    
    async def execute(self, state: WorkflowState) -> WorkflowState:
        """Generate all website content based on strategy and wizard data"""
        
        try:
            state.update_progress("Generating website content", 25.0)
            
            wizard_data = state.wizard_data
            strategy = state.metadata.get("content_strategy", {})
            
            # Generate different types of content
            content = {}
            
            # Homepage content
            state.update_progress("Generating homepage content", 30.0)
            content["homepage"] = await self._generate_homepage_content(wizard_data, strategy)
            
            # About page content
            state.update_progress("Generating about page content", 40.0)
            content["about"] = await self._generate_about_content(wizard_data, strategy)
            
            # Services content
            if wizard_data.get("selectedServices"):
                state.update_progress("Generating services content", 45.0)
                content["services"] = await self._generate_services_content(wizard_data, strategy)
            
            # Contact page content
            state.update_progress("Generating contact page content", 50.0)
            content["contact"] = await self._generate_contact_content(wizard_data, strategy)
            
            # Blog posts (if blog structure selected)
            if self._has_blog_structure(wizard_data):
                state.update_progress("Generating blog content", 55.0)
                content["blog_posts"] = await self._generate_blog_posts(wizard_data, strategy)
            
            # Additional pages based on website structure
            additional_content = await self._generate_additional_pages(wizard_data, strategy)
            content.update(additional_content)
            
            # Store generated content
            state.generated_content = content
            state.update_progress("Content generation completed", 60.0)
            
            self.logger.info(
                "Content generation completed successfully",
                workflow_id=state.workflow_id,
                content_sections=list(content.keys()),
                total_sections=len(content)
            )
            
        except Exception as e:
            error_msg = f"Content generation failed: {str(e)}"
            state.add_error(error_msg, "ContentGenerator")
            
        return state
    
    async def _generate_homepage_content(self, wizard_data: Dict[str, Any], strategy: Dict[str, Any]) -> Dict[str, Any]:
        """Generate comprehensive homepage content"""
        
        business_info = wizard_data.get("businessInfo", {})
        services = wizard_data.get("selectedServices", [])
        branding = wizard_data.get("branding", {})
        target_audience = strategy.get("target_audience", {})
        messaging = strategy.get("messaging_strategy", {})
        
        prompt = f"""
        Create comprehensive homepage content for a {business_info.get("name", "business")} website.
        
        BUSINESS CONTEXT:
        - Business Name: {business_info.get("name", "")}
        - Industry: {business_info.get("industry", "")}
        - Description: {business_info.get("description", "")}
        - Key Services: {[s.get("name", "") for s in services[:4]]}
        - Brand Values: {branding.get("values", [])}
        - Unique Selling Points: {branding.get("uniqueSellingPoints", [])}
        
        TARGET AUDIENCE:
        - Primary Persona: {target_audience.get("primary_persona", {}).get("name", "Target Customer")}
        - Pain Points: {target_audience.get("primary_persona", {}).get("pain_points", [])}
        - Goals: {target_audience.get("primary_persona", {}).get("goals", [])}
        
        MESSAGING STRATEGY:
        - Value Proposition: {messaging.get("value_proposition", "")}
        - Key Messages: {messaging.get("key_messages", [])}
        - Brand Voice: {messaging.get("brand_voice", "professional and friendly")}
        
        Generate homepage content with these sections:
        
        1. HERO SECTION:
           - Compelling headline (8-12 words, benefit-focused)
           - Supporting subheadline (20-30 words, clarifies value)
           - Hero description (2-3 sentences explaining unique value)
           - Primary call-to-action (3-5 words, action-oriented)
           - Secondary call-to-action (alternative action)
        
        2. VALUE PROPOSITION:
           - Core benefit statement
           - Supporting points (3-4 key benefits)
           - Social proof or credibility indicator
        
        3. SERVICES OVERVIEW:
           - Section headline
           - Brief introduction
           - Service highlights (3-4 top services with brief descriptions)
           - Call-to-action to services page
        
        4. WHY CHOOSE US:
           - Section headline
           - Unique advantages (3-4 differentiators)
           - Supporting details for each advantage
        
        5. ABOUT PREVIEW:
           - Brief company story (2-3 sentences)
           - Mission or vision statement
           - Call-to-action to about page
        
        6. TESTIMONIALS:
           - Section headline
           - Placeholder for 2-3 testimonials structure
           - Call-to-action for more testimonials
        
        7. CONTACT CTA:
           - Final call-to-action section
           - Compelling reason to contact
           - Multiple contact options
        
        Return as JSON with clear section structure.
        """
        
        response = await self.generate_structured_content(
            prompt=prompt,
            temperature=0.8,
            schema=self._get_homepage_schema()
        )
        
        return response
    
    async def _generate_about_content(self, wizard_data: Dict[str, Any], strategy: Dict[str, Any]) -> Dict[str, Any]:
        """Generate about page content"""
        
        business_info = wizard_data.get("businessInfo", {})
        branding = wizard_data.get("branding", {})
        messaging = strategy.get("messaging_strategy", {})
        
        prompt = f"""
        Create compelling about page content for {business_info.get("name", "the business")}.
        
        BUSINESS INFORMATION:
        - Business Name: {business_info.get("name", "")}
        - Industry: {business_info.get("industry", "")}
        - Description: {business_info.get("description", "")}
        - Founded: {business_info.get("founded", "Not specified")}
        - Location: {wizard_data.get("locationInfo", {}).get("city", "")}, {wizard_data.get("locationInfo", {}).get("state", "")}
        
        BRAND CONTEXT:
        - Values: {branding.get("values", [])}
        - Mission: {branding.get("mission", "")}
        - Vision: {branding.get("vision", "")}
        - Brand Voice: {messaging.get("brand_voice", "professional and friendly")}
        
        Generate about page content with:
        
        1. COMPANY STORY:
           - Engaging opening that connects with readers
           - Origin story or founding inspiration
           - Evolution and growth journey
           - Current status and achievements
        
        2. MISSION & VALUES:
           - Clear mission statement
           - Core values with explanations
           - How values guide business decisions
        
        3. TEAM SECTION:
           - Team introduction
           - Key team members (placeholder structure)
           - Team qualifications and expertise
           - Team culture and working style
        
        4. WHY WE'RE DIFFERENT:
           - Unique approach or methodology
           - What sets the company apart
           - Client benefits and advantages
        
        5. ACHIEVEMENTS:
           - Notable accomplishments
           - Awards or recognition
           - Key milestones
           - Client success metrics
        
        6. CALL TO ACTION:
           - Invitation to connect
           - Next steps for potential clients
           - Contact information integration
        
        Return as JSON with structured content.
        """
        
        response = await self.generate_structured_content(
            prompt=prompt,
            temperature=0.7,
            schema=self._get_about_schema()
        )
        
        return response
    
    async def _generate_services_content(self, wizard_data: Dict[str, Any], strategy: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate content for each service"""
        
        services = wizard_data.get("selectedServices", [])
        business_info = wizard_data.get("businessInfo", {})
        messaging = strategy.get("messaging_strategy", {})
        target_audience = strategy.get("target_audience", {})
        
        services_content = []
        
        for service in services:
            prompt = f"""
            Create detailed service page content for this service offering:
            
            SERVICE DETAILS:
            - Service Name: {service.get("name", "")}
            - Description: {service.get("description", "")}
            - Price: {service.get("price", "Contact for pricing")}
            - Duration: {service.get("duration", "Varies")}
            - Category: {service.get("category", "")}
            
            BUSINESS CONTEXT:
            - Business: {business_info.get("name", "")}
            - Industry: {business_info.get("industry", "")}
            - Brand Voice: {messaging.get("brand_voice", "professional")}
            
            TARGET AUDIENCE:
            - Pain Points: {target_audience.get("primary_persona", {}).get("pain_points", [])}
            - Goals: {target_audience.get("primary_persona", {}).get("goals", [])}
            
            Generate service content with:
            
            1. SERVICE OVERVIEW:
               - Compelling headline
               - Service description (2-3 paragraphs)
               - Key benefits and outcomes
               - Who this service is for
            
            2. FEATURES & BENEFITS:
               - Detailed feature list (5-7 features)
               - Benefit explanation for each feature
               - How it solves customer problems
            
            3. PROCESS:
               - Step-by-step process (4-6 steps)
               - What clients can expect
               - Timeline and deliverables
            
            4. PRICING:
               - Pricing structure
               - What's included
               - Value justification
               - Payment options
            
            5. WHY CHOOSE US:
               - Service differentiators
               - Expertise and experience
               - Success stories or results
            
            6. CALL TO ACTION:
               - Primary CTA (booking/inquiry)
               - Secondary CTA (more information)
               - Contact options
            
            Return as JSON with structured service content.
            """
            
            service_content = await self.generate_structured_content(
                prompt=prompt,
                temperature=0.7,
                schema=self._get_service_schema()
            )
            
            service_content["service_name"] = service.get("name", "")
            service_content["service_id"] = service.get("id", "")
            services_content.append(service_content)
        
        return services_content
    
    async def _generate_contact_content(self, wizard_data: Dict[str, Any], strategy: Dict[str, Any]) -> Dict[str, Any]:
        """Generate contact page content"""
        
        business_info = wizard_data.get("businessInfo", {})
        location_info = wizard_data.get("locationInfo", {})
        contact_info = wizard_data.get("contactInfo", {})
        
        prompt = f"""
        Create engaging contact page content for {business_info.get("name", "the business")}.
        
        BUSINESS INFORMATION:
        - Business Name: {business_info.get("name", "")}
        - Industry: {business_info.get("industry", "")}
        
        LOCATION:
        - Address: {location_info.get("address", "")}
        - City: {location_info.get("city", "")}
        - State: {location_info.get("state", "")}
        - ZIP: {location_info.get("zipCode", "")}
        - Phone: {contact_info.get("phone", "")}
        - Email: {contact_info.get("email", "")}
        
        Generate contact page content with:
        
        1. CONTACT HEADER:
           - Welcoming headline
           - Invitation to get in touch
           - Brief description of response time
        
        2. CONTACT METHODS:
           - Multiple ways to contact
           - When to use each method
           - Expected response times
        
        3. BUSINESS HOURS:
           - Operating hours
           - Time zone specification
           - Holiday schedules note
        
        4. LOCATION INFO:
           - Address details
           - Directions or landmarks
           - Parking information
           - Public transportation
        
        5. CONTACT FORM:
           - Form introduction
           - What information to include
           - Privacy assurance
        
        6. FAQ SECTION:
           - Common questions about contacting
           - Response time expectations
           - Emergency contact info
        
        Return as JSON with structured contact content.
        """
        
        response = await self.generate_structured_content(
            prompt=prompt,
            temperature=0.6,
            schema=self._get_contact_schema()
        )
        
        return response
    
    async def _generate_blog_posts(self, wizard_data: Dict[str, Any], strategy: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate blog post ideas and sample content"""
        
        business_info = wizard_data.get("businessInfo", {})
        services = wizard_data.get("selectedServices", [])
        seo_keywords = strategy.get("seo_keywords", {})
        target_audience = strategy.get("target_audience", {})
        
        prompt = f"""
        Create blog content strategy and sample posts for {business_info.get("name", "the business")}.
        
        BUSINESS CONTEXT:
        - Industry: {business_info.get("industry", "")}
        - Services: {[s.get("name", "") for s in services]}
        - SEO Keywords: {seo_keywords.get("primary", [])}
        
        TARGET AUDIENCE:
        - Primary Persona: {target_audience.get("primary_persona", {}).get("name", "")}
        - Pain Points: {target_audience.get("primary_persona", {}).get("pain_points", [])}
        - Goals: {target_audience.get("primary_persona", {}).get("goals", [])}
        
        Generate blog content with:
        
        1. BLOG STRATEGY:
           - Content themes and categories
           - Publishing frequency recommendation
           - Content goals and metrics
        
        2. SAMPLE BLOG POSTS (3-5 posts):
           For each post include:
           - SEO-optimized title
           - Meta description
           - Blog post outline (5-7 sections)
           - Key points for each section
           - Target keywords
           - Call-to-action
        
        3. CONTENT CALENDAR:
           - Monthly content themes
           - Seasonal content ideas
           - Evergreen content topics
        
        Return as JSON with blog strategy and sample posts.
        """
        
        response = await self.generate_structured_content(
            prompt=prompt,
            temperature=0.8,
            schema=self._get_blog_schema()
        )
        
        return response
    
    async def _generate_additional_pages(self, wizard_data: Dict[str, Any], strategy: Dict[str, Any]) -> Dict[str, Any]:
        """Generate content for additional pages based on website structure"""
        
        additional_content = {}
        website_structure = wizard_data.get("websiteStructure", {})
        selected_pages = website_structure.get("selectedPages", [])
        
        # FAQ page
        if "faq" in selected_pages:
            additional_content["faq"] = await self._generate_faq_content(wizard_data, strategy)
        
        # Testimonials page
        if "testimonials" in selected_pages:
            additional_content["testimonials"] = await self._generate_testimonials_content(wizard_data, strategy)
        
        # Privacy Policy
        if "privacy" in selected_pages:
            additional_content["privacy"] = await self._generate_privacy_policy(wizard_data)
        
        # Terms of Service
        if "terms" in selected_pages:
            additional_content["terms"] = await self._generate_terms_of_service(wizard_data)
        
        return additional_content
    
    async def _generate_faq_content(self, wizard_data: Dict[str, Any], strategy: Dict[str, Any]) -> Dict[str, Any]:
        """Generate FAQ page content"""
        
        business_info = wizard_data.get("businessInfo", {})
        services = wizard_data.get("selectedServices", [])
        target_audience = strategy.get("target_audience", {})
        
        prompt = f"""
        Create comprehensive FAQ content for {business_info.get("name", "the business")}.
        
        BUSINESS CONTEXT:
        - Business: {business_info.get("name", "")}
        - Industry: {business_info.get("industry", "")}
        - Services: {[s.get("name", "") for s in services]}
        
        TARGET AUDIENCE CONCERNS:
        - Pain Points: {target_audience.get("primary_persona", {}).get("pain_points", [])}
        - Goals: {target_audience.get("primary_persona", {}).get("goals", [])}
        
        Generate FAQ content with:
        
        1. FAQ CATEGORIES:
           - General Questions
           - Service-specific Questions
           - Pricing and Payment
           - Process and Timeline
           - Support and Contact
        
        2. QUESTIONS AND ANSWERS (15-20 FAQs):
           For each FAQ include:
           - Clear, specific question
           - Comprehensive answer
           - Related links or actions
           - Category classification
        
        3. FAQ STRUCTURE:
           - Introduction to FAQs
           - Search functionality note
           - Contact info for unlisted questions
        
        Return as JSON with categorized FAQs.
        """
        
        response = await self.generate_structured_content(
            prompt=prompt,
            temperature=0.5,
            schema=self._get_faq_schema()
        )
        
        return response
    
    def _has_blog_structure(self, wizard_data: Dict[str, Any]) -> bool:
        """Check if website includes blog functionality"""
        structure = wizard_data.get("websiteStructure", {})
        return (structure.get("hasBlog", False) or 
                "blog" in structure.get("selectedPages", []) or
                structure.get("type") == "blog")
    
    # Schema definitions for structured content
    def _get_homepage_schema(self) -> Dict[str, Any]:
        """Get JSON schema for homepage content"""
        return {
            "type": "object",
            "required": ["hero", "value_proposition", "services_overview", "why_choose_us", "about_preview", "contact_cta"],
            "properties": {
                "hero": {
                    "type": "object",
                    "properties": {
                        "headline": {"type": "string"},
                        "subheadline": {"type": "string"},
                        "description": {"type": "string"},
                        "primary_cta": {"type": "string"},
                        "secondary_cta": {"type": "string"}
                    }
                },
                "value_proposition": {
                    "type": "object",
                    "properties": {
                        "statement": {"type": "string"},
                        "benefits": {"type": "array", "items": {"type": "string"}},
                        "credibility": {"type": "string"}
                    }
                },
                "services_overview": {
                    "type": "object",
                    "properties": {
                        "headline": {"type": "string"},
                        "introduction": {"type": "string"},
                        "highlights": {"type": "array"},
                        "cta": {"type": "string"}
                    }
                }
            }
        }
    
    def _get_about_schema(self) -> Dict[str, Any]:
        """Get JSON schema for about page content"""
        return {
            "type": "object",
            "required": ["company_story", "mission_values", "team", "differentiators", "cta"],
            "properties": {
                "company_story": {
                    "type": "object",
                    "properties": {
                        "opening": {"type": "string"},
                        "origin": {"type": "string"},
                        "journey": {"type": "string"},
                        "current_status": {"type": "string"}
                    }
                },
                "mission_values": {
                    "type": "object",
                    "properties": {
                        "mission": {"type": "string"},
                        "values": {"type": "array"}
                    }
                }
            }
        }
    
    def _get_service_schema(self) -> Dict[str, Any]:
        """Get JSON schema for service content"""
        return {
            "type": "object",
            "required": ["overview", "features_benefits", "process", "pricing", "why_choose", "cta"],
            "properties": {
                "overview": {
                    "type": "object",
                    "properties": {
                        "headline": {"type": "string"},
                        "description": {"type": "string"},
                        "benefits": {"type": "array"},
                        "target_audience": {"type": "string"}
                    }
                },
                "process": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "step": {"type": "string"},
                            "description": {"type": "string"}
                        }
                    }
                }
            }
        }
    
    def _get_contact_schema(self) -> Dict[str, Any]:
        """Get JSON schema for contact content"""
        return {
            "type": "object",
            "required": ["header", "contact_methods", "business_hours", "location_info"],
            "properties": {
                "header": {
                    "type": "object",
                    "properties": {
                        "headline": {"type": "string"},
                        "description": {"type": "string"}
                    }
                },
                "contact_methods": {"type": "array"},
                "business_hours": {"type": "object"},
                "location_info": {"type": "object"}
            }
        }
    
    def _get_blog_schema(self) -> Dict[str, Any]:
        """Get JSON schema for blog content"""
        return {
            "type": "object",
            "required": ["strategy", "sample_posts"],
            "properties": {
                "strategy": {
                    "type": "object",
                    "properties": {
                        "themes": {"type": "array"},
                        "frequency": {"type": "string"},
                        "goals": {"type": "array"}
                    }
                },
                "sample_posts": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "title": {"type": "string"},
                            "meta_description": {"type": "string"},
                            "outline": {"type": "array"},
                            "keywords": {"type": "array"}
                        }
                    }
                }
            }
        }
    
    def _get_faq_schema(self) -> Dict[str, Any]:
        """Get JSON schema for FAQ content"""
        return {
            "type": "object",
            "required": ["categories", "faqs"],
            "properties": {
                "categories": {"type": "array", "items": {"type": "string"}},
                "faqs": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "question": {"type": "string"},
                            "answer": {"type": "string"},
                            "category": {"type": "string"}
                        }
                    }
                }
            }
        }
    
    async def validate_inputs(self, state: WorkflowState) -> List[str]:
        """Validate inputs for content generation"""
        errors = []
        
        wizard_data = state.wizard_data
        strategy = state.metadata.get("content_strategy", {})
        
        # Check for required wizard data
        if not wizard_data.get("businessInfo", {}).get("name"):
            errors.append("Business name is required for content generation")
        
        # Check for content strategy
        if not strategy:
            errors.append("Content strategy is required for content generation")
        
        return errors
