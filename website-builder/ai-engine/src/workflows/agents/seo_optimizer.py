"""
SEO Optimizer Agent
Optimizes website content for search engines while maintaining readability
"""

from typing import Dict, Any, List
import json
from datetime import datetime

from .base_agent import BaseAgent
from ..base import WorkflowState
from ...services.ollama_client import OllamaClient

class SEOOptimizer(BaseAgent):
    """Agent for SEO optimization and metadata generation"""
    
    def __init__(self, ollama_client: OllamaClient):
        super().__init__(
            ollama_client=ollama_client,
            model="mistral:7b",
            task_type="seo_optimization"
        )
        
        self.system_prompt = """You are an SEO specialist and technical SEO expert. 
        Optimize website content for search engines while maintaining excellent user experience.
        
        Your optimization should include:
        - Compelling meta titles and descriptions
        - Strategic keyword placement
        - Structured data markup
        - Internal linking opportunities
        - Content optimization recommendations
        - Technical SEO considerations
        
        Always balance SEO optimization with readability and user value."""
    
    async def execute(self, state: WorkflowState) -> WorkflowState:
        """Add comprehensive SEO optimization to generated content"""
        
        try:
            state.update_progress("Optimizing content for SEO", 65.0)
            
            wizard_data = state.wizard_data
            content = state.generated_content
            strategy = state.metadata.get("content_strategy", {})
            
            # Generate SEO metadata for each page
            seo_data = {}
            
            # Homepage SEO
            if content.get("homepage"):
                state.update_progress("Optimizing homepage SEO", 67.0)
                seo_data["homepage"] = await self._optimize_homepage_seo(wizard_data, content["homepage"], strategy)
            
            # About page SEO
            if content.get("about"):
                state.update_progress("Optimizing about page SEO", 69.0)
                seo_data["about"] = await self._optimize_about_seo(wizard_data, content["about"], strategy)
            
            # Services SEO
            if content.get("services"):
                state.update_progress("Optimizing services SEO", 71.0)
                seo_data["services"] = await self._optimize_services_seo(wizard_data, content["services"], strategy)
            
            # Contact page SEO
            if content.get("contact"):
                state.update_progress("Optimizing contact page SEO", 73.0)
                seo_data["contact"] = await self._optimize_contact_seo(wizard_data, content["contact"], strategy)
            
            # Blog posts SEO
            if content.get("blog_posts"):
                state.update_progress("Optimizing blog SEO", 75.0)
                seo_data["blog"] = await self._optimize_blog_seo(wizard_data, content["blog_posts"], strategy)
            
            # Generate structured data
            state.update_progress("Generating structured data", 77.0)
            structured_data = await self._generate_structured_data(wizard_data, strategy)
            
            # Generate sitemap structure
            state.update_progress("Planning sitemap", 79.0)
            sitemap_data = await self._generate_sitemap_structure(wizard_data, seo_data)
            
            # SEO recommendations
            state.update_progress("Creating SEO recommendations", 80.0)
            seo_recommendations = await self._generate_seo_recommendations(wizard_data, content, strategy)
            
            # Store SEO data in state
            state.metadata["seo_optimization"] = seo_data
            state.metadata["structured_data"] = structured_data
            state.metadata["sitemap_structure"] = sitemap_data
            state.metadata["seo_recommendations"] = seo_recommendations
            
            state.update_progress("SEO optimization completed", 82.0)
            
            self.logger.info(
                "SEO optimization completed successfully",
                workflow_id=state.workflow_id,
                pages_optimized=len(seo_data),
                structured_data_types=len(structured_data) if isinstance(structured_data, dict) else 1,
                recommendations_count=len(seo_recommendations) if isinstance(seo_recommendations, list) else 0
            )
            
        except Exception as e:
            error_msg = f"SEO optimization failed: {str(e)}"
            state.add_error(error_msg, "SEOOptimizer")
            
        return state
    
    async def _optimize_homepage_seo(self, wizard_data: Dict[str, Any], homepage_content: Dict[str, Any], strategy: Dict[str, Any]) -> Dict[str, Any]:
        """Generate SEO metadata for homepage"""
        
        business_info = wizard_data.get("businessInfo", {})
        location = wizard_data.get("locationInfo", {})
        services = wizard_data.get("selectedServices", [])
        seo_keywords = strategy.get("seo_keywords", {})
        messaging = strategy.get("messaging_strategy", {})
        
        prompt = f"""
        Create comprehensive SEO optimization for a homepage with this information:
        
        BUSINESS CONTEXT:
        - Business Name: {business_info.get("name", "")}
        - Industry: {business_info.get("industry", "")}
        - Description: {business_info.get("description", "")}
        - Location: {location.get("city", "")}, {location.get("state", "")}
        - Services: {[s.get("name", "") for s in services[:5]]}
        
        SEO STRATEGY:
        - Primary Keywords: {seo_keywords.get("primary", [])}
        - Secondary Keywords: {seo_keywords.get("secondary", [])}
        - Local Keywords: {seo_keywords.get("local", [])}
        - Value Proposition: {messaging.get("value_proposition", "")}
        
        HOMEPAGE CONTENT:
        - Hero Headline: {homepage_content.get("hero", {}).get("headline", "")}
        - Hero Description: {homepage_content.get("hero", {}).get("description", "")}
        
        Generate SEO optimization with:
        
        1. TITLE TAG:
           - 50-60 characters
           - Include primary keyword and business name
           - Compelling and click-worthy
           - Location if applicable
        
        2. META DESCRIPTION:
           - 150-160 characters
           - Include primary keyword naturally
           - Clear value proposition
           - Call-to-action
           - Location if local business
        
        3. HEADER OPTIMIZATION:
           - H1 tag recommendation
           - H2-H6 structure for content sections
           - Keyword placement suggestions
        
        4. KEYWORD OPTIMIZATION:
           - Primary keyword placement (title, H1, first paragraph)
           - Secondary keyword integration
           - LSI keywords and variations
           - Keyword density recommendations
        
        5. OPEN GRAPH DATA:
           - og:title (optimized for social sharing)
           - og:description (compelling social description)
           - og:type, og:url, og:image recommendations
        
        6. TWITTER CARD DATA:
           - twitter:card type
           - twitter:title
           - twitter:description
        
        7. SCHEMA MARKUP:
           - Organization schema
           - LocalBusiness schema (if applicable)
           - WebSite schema with search action
        
        8. INTERNAL LINKING:
           - Strategic internal links to important pages
           - Anchor text recommendations
           - Link hierarchy suggestions
        
        Return as JSON with all SEO elements.
        """
        
        response = await self.generate_structured_content(
            prompt=prompt,
            temperature=0.4,
            schema=self._get_seo_schema()
        )
        
        return response
    
    async def _optimize_services_seo(self, wizard_data: Dict[str, Any], services_content: List[Dict[str, Any]], strategy: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate SEO optimization for service pages"""
        
        business_info = wizard_data.get("businessInfo", {})
        location = wizard_data.get("locationInfo", {})
        seo_keywords = strategy.get("seo_keywords", {})
        
        optimized_services = []
        
        for service_content in services_content:
            service_name = service_content.get("service_name", "Service")
            
            prompt = f"""
            Create SEO optimization for a service page:
            
            SERVICE INFORMATION:
            - Service Name: {service_name}
            - Business: {business_info.get("name", "")}
            - Location: {location.get("city", "")}, {location.get("state", "")}
            - Industry: {business_info.get("industry", "")}
            
            SERVICE CONTENT:
            - Headline: {service_content.get("overview", {}).get("headline", "")}
            - Description: {service_content.get("overview", {}).get("description", "")}
            
            SEO KEYWORDS:
            - Primary Keywords: {seo_keywords.get("primary", [])}
            - Secondary Keywords: {seo_keywords.get("secondary", [])}
            - Local Keywords: {seo_keywords.get("local", [])}
            
            Generate service page SEO with:
            
            1. TITLE TAG:
               - Include service name and location
               - 50-60 characters
               - Primary keyword integration
            
            2. META DESCRIPTION:
               - Service-specific description
               - Benefits and outcomes
               - Local relevance
               - Call-to-action
            
            3. HEADER STRUCTURE:
               - H1 with service name and keyword
               - H2 for major sections
               - H3 for subsections
            
            4. KEYWORD OPTIMIZATION:
               - Service-specific keyword placement
               - Long-tail keyword integration
               - Local SEO optimization
            
            5. SCHEMA MARKUP:
               - Service schema
               - LocalBusiness (if applicable)
               - Review/Rating schema structure
            
            6. FAQ SCHEMA:
               - Common service questions
               - Structured FAQ markup
            
            Return as JSON with service SEO data.
            """
            
            service_seo = await self.generate_structured_content(
                prompt=prompt,
                temperature=0.4,
                schema=self._get_service_seo_schema()
            )
            
            service_seo["service_name"] = service_name
            service_seo["service_id"] = service_content.get("service_id", "")
            optimized_services.append(service_seo)
        
        return optimized_services
    
    async def _generate_structured_data(self, wizard_data: Dict[str, Any], strategy: Dict[str, Any]) -> Dict[str, Any]:
        """Generate comprehensive JSON-LD structured data"""
        
        business_info = wizard_data.get("businessInfo", {})
        location = wizard_data.get("locationInfo", {})
        contact_info = wizard_data.get("contactInfo", {})
        services = wizard_data.get("selectedServices", [])
        
        # Base organization schema
        organization_schema = {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": business_info.get("name", ""),
            "description": business_info.get("description", ""),
            "url": "{{WEBSITE_URL}}",  # Placeholder for actual URL
            "logo": "{{WEBSITE_URL}}/images/logo.png",
            "image": "{{WEBSITE_URL}}/images/hero-image.jpg"
        }
        
        # Add contact information
        if contact_info:
            organization_schema["telephone"] = contact_info.get("phone", "")
            organization_schema["email"] = contact_info.get("email", "")
        
        # Add address if available
        if location:
            organization_schema["address"] = {
                "@type": "PostalAddress",
                "streetAddress": location.get("address", ""),
                "addressLocality": location.get("city", ""),
                "addressRegion": location.get("state", ""),
                "postalCode": location.get("zipCode", ""),
                "addressCountry": location.get("country", "US")
            }
            
            # Add geographic coordinates if available
            if location.get("latitude") and location.get("longitude"):
                organization_schema["geo"] = {
                    "@type": "GeoCoordinates",
                    "latitude": location.get("latitude"),
                    "longitude": location.get("longitude")
                }
        
        # LocalBusiness schema for location-based businesses
        local_business_schema = None
        if location.get("city"):
            local_business_schema = {
                "@context": "https://schema.org",
                "@type": "LocalBusiness",
                "name": business_info.get("name", ""),
                "description": business_info.get("description", ""),
                "url": "{{WEBSITE_URL}}",
                "telephone": contact_info.get("phone", ""),
                "email": contact_info.get("email", ""),
                "address": organization_schema.get("address", {}),
                "geo": organization_schema.get("geo", {}),
                "openingHours": "Mo-Fr 09:00-17:00",  # Default hours
                "priceRange": "$$"  # Default price range
            }
        
        # Services schema
        services_schema = []
        if services:
            for service in services:
                service_schema = {
                    "@type": "Service",
                    "name": service.get("name", ""),
                    "description": service.get("description", ""),
                    "provider": {
                        "@type": "Organization",
                        "name": business_info.get("name", "")
                    }
                }
                
                # Add price if available
                if service.get("price"):
                    service_schema["offers"] = {
                        "@type": "Offer",
                        "price": service.get("price", ""),
                        "priceCurrency": "USD"
                    }
                
                services_schema.append(service_schema)
        
        # Website schema
        website_schema = {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": f"{business_info.get('name', '')} - Official Website",
            "url": "{{WEBSITE_URL}}",
            "description": business_info.get("description", ""),
            "publisher": {
                "@type": "Organization",
                "name": business_info.get("name", "")
            },
            "potentialAction": {
                "@type": "SearchAction",
                "target": "{{WEBSITE_URL}}/search?q={search_term_string}",
                "query-input": "required name=search_term_string"
            }
        }
        
        # Breadcrumb schema template
        breadcrumb_schema = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Home",
                    "item": "{{WEBSITE_URL}}"
                }
            ]
        }
        
        return {
            "organization": organization_schema,
            "local_business": local_business_schema,
            "services": services_schema,
            "website": website_schema,
            "breadcrumb_template": breadcrumb_schema
        }
    
    async def _generate_sitemap_structure(self, wizard_data: Dict[str, Any], seo_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate XML sitemap structure"""
        
        website_structure = wizard_data.get("websiteStructure", {})
        
        sitemap_urls = []
        
        # Homepage
        sitemap_urls.append({
            "loc": "{{WEBSITE_URL}}/",
            "changefreq": "weekly",
            "priority": "1.0",
            "lastmod": "{{CURRENT_DATE}}"
        })
        
        # About page
        sitemap_urls.append({
            "loc": "{{WEBSITE_URL}}/about/",
            "changefreq": "monthly",
            "priority": "0.8",
            "lastmod": "{{CURRENT_DATE}}"
        })
        
        # Services pages
        services = wizard_data.get("selectedServices", [])
        if services:
            # Main services page
            sitemap_urls.append({
                "loc": "{{WEBSITE_URL}}/services/",
                "changefreq": "monthly",
                "priority": "0.9",
                "lastmod": "{{CURRENT_DATE}}"
            })
            
            # Individual service pages
            for service in services:
                service_slug = service.get("name", "").lower().replace(" ", "-").replace("&", "and")
                sitemap_urls.append({
                    "loc": f"{{{{WEBSITE_URL}}}}/services/{service_slug}/",
                    "changefreq": "monthly",
                    "priority": "0.7",
                    "lastmod": "{{CURRENT_DATE}}"
                })
        
        # Contact page
        sitemap_urls.append({
            "loc": "{{WEBSITE_URL}}/contact/",
            "changefreq": "yearly",
            "priority": "0.6",
            "lastmod": "{{CURRENT_DATE}}"
        })
        
        # Additional pages
        selected_pages = website_structure.get("selectedPages", [])
        page_priorities = {
            "blog": 0.8,
            "faq": 0.5,
            "testimonials": 0.6,
            "privacy": 0.3,
            "terms": 0.3
        }
        
        for page in selected_pages:
            if page in page_priorities:
                sitemap_urls.append({
                    "loc": f"{{{{WEBSITE_URL}}}}/{page}/",
                    "changefreq": "monthly" if page == "blog" else "yearly",
                    "priority": str(page_priorities[page]),
                    "lastmod": "{{CURRENT_DATE}}"
                })
        
        return {
            "urls": sitemap_urls,
            "total_urls": len(sitemap_urls),
            "generated_at": datetime.utcnow().isoformat()
        }
    
    async def _generate_seo_recommendations(self, wizard_data: Dict[str, Any], content: Dict[str, Any], strategy: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate SEO recommendations and best practices"""
        
        recommendations = []
        
        # Content recommendations
        recommendations.append({
            "category": "Content",
            "priority": "High",
            "title": "Add compelling meta descriptions",
            "description": "Ensure all pages have unique, keyword-rich meta descriptions under 160 characters",
            "implementation": "Include primary keywords naturally while maintaining readability"
        })
        
        # Technical SEO
        recommendations.append({
            "category": "Technical",
            "priority": "High",
            "title": "Implement structured data",
            "description": "Add JSON-LD structured data for organization, services, and local business",
            "implementation": "Use generated schema markup on relevant pages"
        })
        
        # Local SEO (if applicable)
        location = wizard_data.get("locationInfo", {})
        if location.get("city"):
            recommendations.append({
                "category": "Local SEO",
                "priority": "High",
                "title": "Optimize for local search",
                "description": "Include location-based keywords and create Google My Business profile",
                "implementation": "Add city/state to title tags and create location-specific content"
            })
        
        # Image optimization
        recommendations.append({
            "category": "Images",
            "priority": "Medium",
            "title": "Optimize images for SEO",
            "description": "Add descriptive alt text and optimize file sizes",
            "implementation": "Use keywords in alt text naturally, compress images for faster loading"
        })
        
        # Internal linking
        recommendations.append({
            "category": "Internal Linking",
            "priority": "Medium",
            "title": "Create strategic internal links",
            "description": "Link between related pages using keyword-rich anchor text",
            "implementation": "Link from homepage to important service pages, create topic clusters"
        })
        
        # Content freshness
        if content.get("blog_posts"):
            recommendations.append({
                "category": "Content Marketing",
                "priority": "Medium",
                "title": "Maintain content freshness",
                "description": "Regularly publish new blog content and update existing pages",
                "implementation": "Follow the generated content calendar and update service pages quarterly"
            })
        
        # Performance
        recommendations.append({
            "category": "Performance",
            "priority": "High",
            "title": "Optimize page loading speed",
            "description": "Ensure fast loading times for better user experience and SEO",
            "implementation": "Compress images, minify CSS/JS, use CDN for static assets"
        })
        
        # Mobile optimization
        recommendations.append({
            "category": "Mobile",
            "priority": "High",
            "title": "Ensure mobile responsiveness",
            "description": "Optimize for mobile devices and touch interactions",
            "implementation": "Use responsive design, test on various devices, optimize touch targets"
        })
        
        return recommendations
    
    def _get_seo_schema(self) -> Dict[str, Any]:
        """Get JSON schema for SEO optimization"""
        return {
            "type": "object",
            "required": ["title", "meta_description", "headers", "keywords", "open_graph"],
            "properties": {
                "title": {"type": "string"},
                "meta_description": {"type": "string"},
                "headers": {
                    "type": "object",
                    "properties": {
                        "h1": {"type": "string"},
                        "h2_structure": {"type": "array"},
                        "keyword_placement": {"type": "object"}
                    }
                },
                "keywords": {
                    "type": "object",
                    "properties": {
                        "primary_placement": {"type": "array"},
                        "secondary_integration": {"type": "array"},
                        "lsi_keywords": {"type": "array"}
                    }
                },
                "open_graph": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "description": {"type": "string"},
                        "type": {"type": "string"},
                        "image": {"type": "string"}
                    }
                },
                "twitter_card": {"type": "object"},
                "schema_markup": {"type": "object"},
                "internal_links": {"type": "array"}
            }
        }
    
    def _get_service_seo_schema(self) -> Dict[str, Any]:
        """Get JSON schema for service SEO optimization"""
        return {
            "type": "object",
            "required": ["title", "meta_description", "headers", "schema_markup"],
            "properties": {
                "title": {"type": "string"},
                "meta_description": {"type": "string"},
                "headers": {"type": "object"},
                "keywords": {"type": "object"},
                "schema_markup": {"type": "object"},
                "faq_schema": {"type": "array"}
            }
        }
    
    async def validate_inputs(self, state: WorkflowState) -> List[str]:
        """Validate inputs for SEO optimization"""
        errors = []
        
        if not state.generated_content:
            errors.append("Generated content is required for SEO optimization")
        
        strategy = state.metadata.get("content_strategy", {})
        if not strategy.get("seo_keywords"):
            errors.append("SEO keywords from content strategy are required")
        
        return errors
