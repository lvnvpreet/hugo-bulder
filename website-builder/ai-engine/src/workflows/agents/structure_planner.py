"""
Structure Planner Agent
Plans optimal site structure and navigation for user experience and SEO
"""

from typing import Dict, Any, List
import json
from datetime import datetime

from .base_agent import BaseAgent
from ..base import WorkflowState
from ...services.ollama_client import OllamaClient

class StructurePlanner(BaseAgent):
    """Agent for planning website structure and navigation"""
    
    def __init__(self, ollama_client: OllamaClient):
        super().__init__(
            ollama_client=ollama_client,
            model="llama3.1:8b",
            task_type="analysis"
        )
        
        self.system_prompt = """You are a website architecture specialist and UX strategist. 
        Plan optimal site structure and navigation that provides excellent user experience while supporting SEO goals.
        
        Your planning should consider:
        - User journey and information architecture
        - Navigation hierarchy and usability
        - SEO-friendly URL structure
        - Content organization and discoverability
        - Mobile navigation considerations
        - Accessibility and user experience best practices
        
        Create structures that are intuitive, scalable, and conversion-focused."""
    
    async def execute(self, state: WorkflowState) -> WorkflowState:
        """Plan comprehensive website structure and navigation"""
        
        try:
            state.update_progress("Planning website structure", 85.0)
            
            wizard_data = state.wizard_data
            content = state.generated_content
            strategy = state.metadata.get("content_strategy", {})
            
            # Plan overall site structure
            state.update_progress("Analyzing site architecture", 86.0)
            site_structure = await self._plan_site_structure(wizard_data, content)
            
            # Generate navigation menu
            state.update_progress("Designing navigation", 88.0)
            navigation = await self._generate_navigation(wizard_data, site_structure, strategy)
            
            # Plan URL structure
            state.update_progress("Planning URL structure", 90.0)
            url_structure = await self._plan_url_structure(wizard_data, site_structure)
            
            # Create page hierarchy
            state.update_progress("Creating page hierarchy", 92.0)
            page_hierarchy = await self._create_page_hierarchy(wizard_data, site_structure, content)
            
            # Generate footer structure
            state.update_progress("Planning footer structure", 94.0)
            footer_structure = await self._plan_footer_structure(wizard_data, navigation)
            
            # Create responsive navigation plan
            responsive_navigation = await self._plan_responsive_navigation(navigation)
            
            # Store results in state
            state.metadata["site_structure"] = site_structure
            state.metadata["navigation"] = navigation
            state.metadata["url_structure"] = url_structure
            state.metadata["page_hierarchy"] = page_hierarchy
            state.metadata["footer_structure"] = footer_structure
            state.metadata["responsive_navigation"] = responsive_navigation
            
            state.update_progress("Website structure planning completed", 95.0)
            
            self.logger.info(
                "Structure planning completed successfully",
                workflow_id=state.workflow_id,
                structure_type=site_structure.get("type", "unknown"),
                total_pages=site_structure.get("total_pages", 0),
                navigation_items=len(navigation.get("main_menu", [])) if navigation else 0
            )
            
        except Exception as e:
            error_msg = f"Structure planning failed: {str(e)}"
            state.add_error(error_msg, "StructurePlanner")
            
        return state
    
    async def _plan_site_structure(self, wizard_data: Dict[str, Any], content: Dict[str, Any]) -> Dict[str, Any]:
        """Plan the overall site structure based on content and requirements"""
        
        website_structure = wizard_data.get("websiteStructure", {})
        selected_services = wizard_data.get("selectedServices", [])
        website_type = wizard_data.get("websiteType", {}).get("category", "business")
        
        if website_structure.get("type") == "single-page":
            return await self._plan_single_page_structure(wizard_data, content)
        else:
            return await self._plan_multi_page_structure(wizard_data, content)
    
    async def _plan_single_page_structure(self, wizard_data: Dict[str, Any], content: Dict[str, Any]) -> Dict[str, Any]:
        """Plan single-page website structure with sections"""
        
        website_structure = wizard_data.get("websiteStructure", {})
        selected_sections = website_structure.get("selectedSections", [])
        services = wizard_data.get("selectedServices", [])
        
        prompt = f"""
        Plan a single-page website structure with optimal section order and content flow.
        
        WEBSITE CONTEXT:
        - Website Type: {wizard_data.get("websiteType", {}).get("category", "business")}
        - Business: {wizard_data.get("businessInfo", {}).get("name", "")}
        - Services: {[s.get("name", "") for s in services]}
        - Selected Sections: {selected_sections}
        
        CONTENT AVAILABLE:
        - Homepage Content: {bool(content.get("homepage"))}
        - About Content: {bool(content.get("about"))}
        - Services Content: {bool(content.get("services"))}
        - Contact Content: {bool(content.get("contact"))}
        
        Plan single-page structure with:
        
        1. SECTION ORDERING:
           - Logical content flow for user journey
           - Conversion-optimized sequence
           - Natural reading progression
        
        2. SECTION DETAILS:
           For each section include:
           - Section ID and name
           - Anchor link
           - Display order
           - Content type
           - Scroll behavior
           - Mobile considerations
        
        3. NAVIGATION:
           - Smooth scroll navigation
           - Active section highlighting
           - Mobile sticky navigation
           - Skip links for accessibility
        
        4. USER EXPERIENCE:
           - Content grouping rationale
           - Visual breaks and spacing
           - Call-to-action placement
           - Mobile responsiveness
        
        Return as JSON with complete single-page structure.
        """
        
        response = await self.generate_structured_content(
            prompt=prompt,
            temperature=0.4,
            schema=self._get_single_page_schema()
        )
        
        # Enhance with calculated properties
        response["type"] = "single-page"
        response["total_sections"] = len(response.get("sections", []))
        response["scroll_navigation"] = True
        response["mobile_optimized"] = True
        
        return response
    
    async def _plan_multi_page_structure(self, wizard_data: Dict[str, Any], content: Dict[str, Any]) -> Dict[str, Any]:
        """Plan multi-page website structure"""
        
        selected_pages = wizard_data.get("websiteStructure", {}).get("selectedPages", [])
        selected_services = wizard_data.get("selectedServices", [])
        website_type = wizard_data.get("websiteType", {}).get("category", "business")
        
        prompt = f"""
        Plan a multi-page website structure with optimal page hierarchy and organization.
        
        WEBSITE CONTEXT:
        - Website Type: {website_type}
        - Business: {wizard_data.get("businessInfo", {}).get("name", "")}
        - Services: {[s.get("name", "") for s in selected_services]}
        - Selected Pages: {selected_pages}
        
        CONTENT AVAILABLE:
        - Homepage: {bool(content.get("homepage"))}
        - About: {bool(content.get("about"))}
        - Services: {bool(content.get("services"))}
        - Contact: {bool(content.get("contact"))}
        - Blog: {bool(content.get("blog_posts"))}
        - Additional: {[k for k in content.keys() if k not in ["homepage", "about", "services", "contact", "blog_posts"]]}
        
        Plan multi-page structure with:
        
        1. PAGE HIERARCHY:
           - Primary pages (main navigation)
           - Secondary pages (sub-navigation)
           - Utility pages (footer links)
           - Parent-child relationships
        
        2. PAGE DETAILS:
           For each page include:
           - Page ID and title
           - URL slug
           - Navigation level (primary/secondary/utility)
           - Parent page (if applicable)
           - Display order
           - Content type
           - SEO priority
        
        3. NAVIGATION STRUCTURE:
           - Main navigation menu
           - Sub-navigation organization
           - Breadcrumb structure
           - Footer navigation
        
        4. USER FLOW:
           - Landing page paths
           - Conversion funnels
           - Cross-page relationships
           - Exit intent optimization
        
        Return as JSON with complete multi-page structure.
        """
        
        response = await self.generate_structured_content(
            prompt=prompt,
            temperature=0.4,
            schema=self._get_multi_page_schema()
        )
        
        # Enhance with calculated properties
        response["type"] = "multi-page"
        response["total_pages"] = len(response.get("pages", []))
        response["has_subpages"] = any(p.get("parent") for p in response.get("pages", []))
        
        return response
    
    async def _generate_navigation(self, wizard_data: Dict[str, Any], site_structure: Dict[str, Any], strategy: Dict[str, Any]) -> Dict[str, Any]:
        """Generate comprehensive website navigation"""
        
        business_info = wizard_data.get("businessInfo", {})
        target_audience = strategy.get("target_audience", {})
        
        prompt = f"""
        Create comprehensive website navigation based on the planned site structure.
        
        BUSINESS CONTEXT:
        - Business: {business_info.get("name", "")}
        - Industry: {business_info.get("industry", "")}
        - Target Audience: {target_audience.get("primary_persona", {}).get("name", "General Audience")}
        
        SITE STRUCTURE:
        - Type: {site_structure.get("type", "multi-page")}
        - Total Pages/Sections: {site_structure.get("total_pages", site_structure.get("total_sections", 0))}
        - Structure Details: {json.dumps(site_structure, indent=2)[:500]}...
        
        Generate navigation with:
        
        1. MAIN NAVIGATION:
           - Primary menu items with labels
           - Logical order for user journey
           - Clear, action-oriented labels
           - Dropdown/submenu structure
        
        2. MOBILE NAVIGATION:
           - Hamburger menu structure
           - Touch-friendly design
           - Collapsible sections
           - Priority order for small screens
        
        3. FOOTER NAVIGATION:
           - Footer menu organization
           - Quick links and utilities
           - Contact information placement
           - Legal pages (privacy, terms)
        
        4. UTILITY NAVIGATION:
           - Search functionality
           - Language/location selector
           - Social media links
           - Contact buttons/CTAs
        
        5. BREADCRUMBS:
           - Breadcrumb structure for deep pages
           - User-friendly labeling
           - SEO-optimized paths
        
        6. ACCESSIBILITY:
           - Keyboard navigation support
           - Screen reader friendly
           - Skip links and landmarks
           - Focus indicators
        
        Return as JSON with complete navigation structure.
        """
        
        response = await self.generate_structured_content(
            prompt=prompt,
            temperature=0.5,
            schema=self._get_navigation_schema()
        )
        
        return response
    
    async def _plan_url_structure(self, wizard_data: Dict[str, Any], site_structure: Dict[str, Any]) -> Dict[str, Any]:
        """Plan SEO-friendly URL structure"""
        
        business_name = wizard_data.get("businessInfo", {}).get("name", "")
        services = wizard_data.get("selectedServices", [])
        
        urls = {}
        
        # Homepage
        urls["homepage"] = {
            "path": "/",
            "seo_title": f"{business_name} - Home",
            "priority": 1.0
        }
        
        # Core pages
        core_pages = ["about", "services", "contact"]
        for page in core_pages:
            urls[page] = {
                "path": f"/{page}/",
                "seo_title": f"{page.title()} - {business_name}",
                "priority": 0.8 if page == "services" else 0.6
            }
        
        # Service pages
        if services:
            urls["service_pages"] = []
            for service in services:
                service_slug = service.get("name", "").lower().replace(" ", "-").replace("&", "and")
                service_url = {
                    "service_name": service.get("name", ""),
                    "path": f"/services/{service_slug}/",
                    "parent": "/services/",
                    "seo_title": f"{service.get('name', '')} - {business_name}",
                    "priority": 0.7
                }
                urls["service_pages"].append(service_url)
        
        # Additional pages based on structure
        if site_structure.get("type") == "multi-page":
            pages = site_structure.get("pages", [])
            for page in pages:
                page_id = page.get("id", "")
                if page_id not in ["home", "about", "services", "contact"] and not page_id.startswith("service-"):
                    urls[page_id] = {
                        "path": f"/{page_id}/",
                        "seo_title": f"{page.get('title', page_id.title())} - {business_name}",
                        "priority": 0.5
                    }
        
        return {
            "structure": urls,
            "patterns": {
                "services": "/services/{service-slug}/",
                "blog": "/blog/{post-slug}/",
                "categories": "/category/{category-slug}/"
            },
            "seo_guidelines": {
                "use_hyphens": True,
                "lowercase_only": True,
                "descriptive_slugs": True,
                "avoid_deep_nesting": True,
                "max_url_length": 100
            }
        }
    
    async def _create_page_hierarchy(self, wizard_data: Dict[str, Any], site_structure: Dict[str, Any], content: Dict[str, Any]) -> Dict[str, Any]:
        """Create detailed page hierarchy with content mapping"""
        
        hierarchy = {
            "levels": {},
            "relationships": {},
            "content_mapping": {}
        }
        
        if site_structure.get("type") == "single-page":
            # Single page hierarchy
            sections = site_structure.get("sections", [])
            hierarchy["levels"]["0"] = [{
                "id": "homepage",
                "title": "Home",
                "type": "page",
                "sections": [s.get("id") for s in sections]
            }]
            
            for section in sections:
                hierarchy["content_mapping"][section.get("id")] = {
                    "content_source": content.get(section.get("id").replace("-", "_")),
                    "anchor": section.get("anchor"),
                    "order": section.get("order")
                }
        
        else:
            # Multi-page hierarchy
            pages = site_structure.get("pages", [])
            
            # Group by hierarchy level
            for page in pages:
                level = "0" if not page.get("parent") else "1"
                if level not in hierarchy["levels"]:
                    hierarchy["levels"][level] = []
                
                hierarchy["levels"][level].append(page)
                
                # Map to content
                page_id = page.get("id", "")
                content_key = page_id.replace("-", "_")
                if content_key == "home":
                    content_key = "homepage"
                
                hierarchy["content_mapping"][page_id] = {
                    "content_source": content.get(content_key),
                    "url": page.get("url"),
                    "title": page.get("title")
                }
                
                # Track relationships
                if page.get("parent"):
                    parent_id = page.get("parent")
                    if parent_id not in hierarchy["relationships"]:
                        hierarchy["relationships"][parent_id] = []
                    hierarchy["relationships"][parent_id].append(page_id)
        
        return hierarchy
    
    async def _plan_footer_structure(self, wizard_data: Dict[str, Any], navigation: Dict[str, Any]) -> Dict[str, Any]:
        """Plan comprehensive footer structure"""
        
        business_info = wizard_data.get("businessInfo", {})
        contact_info = wizard_data.get("contactInfo", {})
        location_info = wizard_data.get("locationInfo", {})
        
        footer = {
            "layout": "multi-column",
            "columns": []
        }
        
        # Company info column
        company_column = {
            "title": business_info.get("name", "Company"),
            "type": "company_info",
            "content": {
                "logo": True,
                "description": business_info.get("description", "")[:150],
                "social_links": True
            }
        }
        footer["columns"].append(company_column)
        
        # Quick links column
        main_menu = navigation.get("main_menu", [])
        if main_menu:
            links_column = {
                "title": "Quick Links",
                "type": "navigation",
                "content": {
                    "links": [{"title": item.get("label"), "url": item.get("url")} for item in main_menu[:5]]
                }
            }
            footer["columns"].append(links_column)
        
        # Services column (if applicable)
        services = wizard_data.get("selectedServices", [])
        if services:
            services_column = {
                "title": "Services",
                "type": "services",
                "content": {
                    "links": [{"title": s.get("name"), "url": f"/services/{s.get('name', '').lower().replace(' ', '-')}/"} for s in services[:5]]
                }
            }
            footer["columns"].append(services_column)
        
        # Contact info column
        if contact_info or location_info:
            contact_column = {
                "title": "Contact",
                "type": "contact_info",
                "content": {
                    "phone": contact_info.get("phone", ""),
                    "email": contact_info.get("email", ""),
                    "address": f"{location_info.get('city', '')}, {location_info.get('state', '')}".strip(", ")
                }
            }
            footer["columns"].append(contact_column)
        
        # Footer bottom
        footer["bottom"] = {
            "copyright": f"© {datetime.now().year} {business_info.get('name', 'Company')}. All rights reserved.",
            "legal_links": [
                {"title": "Privacy Policy", "url": "/privacy/"},
                {"title": "Terms of Service", "url": "/terms/"}
            ],
            "back_to_top": True
        }
        
        return footer
    
    async def _plan_responsive_navigation(self, navigation: Dict[str, Any]) -> Dict[str, Any]:
        """Plan responsive navigation behavior"""
        
        return {
            "mobile": {
                "type": "hamburger",
                "breakpoint": "768px",
                "menu_style": "slide_in",
                "close_on_link_click": True,
                "search_in_menu": True
            },
            "tablet": {
                "type": "horizontal",
                "breakpoint": "1024px",
                "dropdown_behavior": "hover_click",
                "search_visible": True
            },
            "desktop": {
                "type": "horizontal",
                "dropdown_behavior": "hover",
                "mega_menu": len(navigation.get("main_menu", [])) > 6,
                "search_prominent": True
            },
            "accessibility": {
                "keyboard_navigation": True,
                "skip_links": True,
                "aria_labels": True,
                "focus_indicators": True
            }
        }
    
    def _get_single_page_schema(self) -> Dict[str, Any]:
        """Get JSON schema for single-page structure"""
        return {
            "type": "object",
            "required": ["sections", "navigation", "user_experience"],
            "properties": {
                "sections": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string"},
                            "name": {"type": "string"},
                            "anchor": {"type": "string"},
                            "order": {"type": "number"},
                            "content_type": {"type": "string"}
                        }
                    }
                },
                "navigation": {"type": "object"},
                "user_experience": {"type": "object"}
            }
        }
    
    def _get_multi_page_schema(self) -> Dict[str, Any]:
        """Get JSON schema for multi-page structure"""
        return {
            "type": "object",
            "required": ["pages", "navigation_structure", "user_flow"],
            "properties": {
                "pages": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string"},
                            "title": {"type": "string"},
                            "url": {"type": "string"},
                            "level": {"type": "string"},
                            "parent": {"type": "string"},
                            "order": {"type": "number"},
                            "seo_priority": {"type": "number"}
                        }
                    }
                },
                "navigation_structure": {"type": "object"},
                "user_flow": {"type": "object"}
            }
        }
    
    def _get_navigation_schema(self) -> Dict[str, Any]:
        """Get JSON schema for navigation structure"""
        return {
            "type": "object",
            "required": ["main_menu", "mobile_navigation", "footer_navigation"],
            "properties": {
                "main_menu": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "label": {"type": "string"},
                            "url": {"type": "string"},
                            "order": {"type": "number"},
                            "dropdown": {"type": "array"}
                        }
                    }
                },
                "mobile_navigation": {"type": "object"},
                "footer_navigation": {"type": "object"},
                "breadcrumbs": {"type": "object"},
                "accessibility": {"type": "object"}
            }
        }
    
    async def validate_inputs(self, state: WorkflowState) -> List[str]:
        """Validate inputs for structure planning"""
        errors = []
        
        wizard_data = state.wizard_data
        
        if not wizard_data.get("websiteStructure"):
            errors.append("Website structure information is required")
        
        if not state.generated_content:
            errors.append("Generated content is required for structure planning")
        
        return errors
