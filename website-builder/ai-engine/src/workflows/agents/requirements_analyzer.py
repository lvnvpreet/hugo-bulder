"""
Requirements Analyzer Agent
Analyzes user requirements and creates comprehensive content strategy
"""

from typing import Dict, Any, List
import json
from datetime import datetime

from .base_agent import BaseAgent
from ..base import WorkflowState
from ...services.ollama_client import OllamaClient

class RequirementsAnalyzer(BaseAgent):
    """Agent for analyzing user requirements and creating content strategy"""
    
    def __init__(self, ollama_client: OllamaClient):
        super().__init__(
            ollama_client=ollama_client, 
            model="llama3.1:8b",
            task_type="analysis"
        )
        
        self.system_prompt = """You are a website requirements analyst and content strategist. 
        Analyze user requirements thoroughly and create a comprehensive content strategy that will guide 
        the entire website creation process.
        
        Your analysis should consider:
        - Target audience identification and personas
        - Business goals and objectives
        - Content priorities and messaging hierarchy
        - SEO opportunities and keyword strategy
        - Competitive positioning
        - User experience considerations
        
        Always respond with valid JSON containing structured analysis."""
    
    async def execute(self, state: WorkflowState) -> WorkflowState:
        """Analyze wizard data and create comprehensive content strategy"""
        
        try:
            state.update_progress("Analyzing requirements", 5.0)
            
            # Extract key information from wizard data
            wizard_data = state.wizard_data
            
            # Create analysis prompt
            analysis_prompt = self._create_analysis_prompt(wizard_data)
            
            # Generate analysis
            analysis_json = await self.generate_structured_content(
                prompt=analysis_prompt,
                temperature=0.3,  # Lower temperature for analytical tasks
                schema=self._get_analysis_schema()
            )
            
            # Process and enhance the analysis
            strategy = self._process_analysis(analysis_json, wizard_data)
            
            # Store results in state
            state.metadata["content_strategy"] = strategy
            state.metadata["target_audience"] = strategy.get("target_audience", {})
            state.metadata["content_goals"] = strategy.get("content_goals", [])
            state.metadata["seo_keywords"] = strategy.get("seo_keywords", [])
            state.metadata["competitive_analysis"] = strategy.get("competitive_analysis", {})
            
            state.update_progress("Requirements analysis completed", 15.0)
            
            self.logger.info(
                "Requirements analysis completed successfully",
                workflow_id=state.workflow_id,
                strategy_keys=list(strategy.keys()),
                keywords_count=len(strategy.get("seo_keywords", [])),
                goals_count=len(strategy.get("content_goals", []))
            )
            
        except Exception as e:
            error_msg = f"Requirements analysis failed: {str(e)}"
            state.add_error(error_msg, "RequirementsAnalyzer")
            
        return state
    
    def _create_analysis_prompt(self, wizard_data: Dict[str, Any]) -> str:
        """Create comprehensive prompt for analyzing requirements"""
        
        # Extract key data
        website_type = wizard_data.get("websiteType", {}).get("category", "business")
        business_info = wizard_data.get("businessInfo", {})
        services = wizard_data.get("selectedServices", [])
        purpose = wizard_data.get("websitePurpose", {})
        target_audience = wizard_data.get("targetAudience", {})
        location_info = wizard_data.get("locationInfo", {})
        branding = wizard_data.get("branding", {})
        features = wizard_data.get("websiteFeatures", [])
        
        prompt = f"""
        Analyze the following website requirements and create a comprehensive content strategy:
        
        BUSINESS INFORMATION:
        - Website Type: {website_type}
        - Business Name: {business_info.get("name", "Not specified")}
        - Business Description: {business_info.get("description", "Not provided")}
        - Industry: {business_info.get("industry", "Not specified")}
        
        WEBSITE PURPOSE & GOALS:
        - Primary Purpose: {purpose.get("primary", "Not specified")}
        - Secondary Goals: {purpose.get("secondary", [])}
        - Success Metrics: {purpose.get("metrics", [])}
        
        SERVICES & OFFERINGS:
        {self._format_services(services)}
        
        TARGET AUDIENCE:
        - Demographics: {target_audience.get("demographics", {})}
        - Interests: {target_audience.get("interests", [])}
        - Pain Points: {target_audience.get("painPoints", [])}
        - Goals: {target_audience.get("goals", [])}
        
        LOCATION & MARKET:
        - Location: {location_info.get("city", "")}, {location_info.get("state", "")}, {location_info.get("country", "")}
        - Market Type: {location_info.get("marketType", "Not specified")}
        - Service Area: {location_info.get("serviceArea", "Not specified")}
        
        BRANDING PREFERENCES:
        - Tone: {branding.get("tone", "Not specified")}
        - Style: {branding.get("style", "Not specified")}
        - Values: {branding.get("values", [])}
        - Unique Selling Points: {branding.get("uniqueSellingPoints", [])}
        
        WEBSITE FEATURES:
        {self._format_features(features)}
        
        ANALYSIS REQUIREMENTS:
        Create a comprehensive content strategy that includes:
        
        1. TARGET AUDIENCE ANALYSIS:
           - Primary persona with demographics, psychographics, and behavior patterns
           - Secondary personas if applicable  
           - User journey mapping and touchpoints
           - Pain points and motivations
        
        2. CONTENT GOALS & OBJECTIVES:
           - Primary content objectives aligned with business goals
           - Secondary objectives and supporting goals
           - Success metrics and KPIs
           - Content hierarchy and priorities
        
        3. MESSAGING STRATEGY:
           - Core value proposition
           - Key messages for different audience segments
           - Tone and voice guidelines
           - Brand positioning statements
        
        4. SEO STRATEGY:
           - Primary keywords (high-volume, business-relevant)
           - Secondary keywords (long-tail, specific)
           - Local SEO keywords (if applicable)
           - Content topics and themes for SEO
        
        5. COMPETITIVE POSITIONING:
           - Market differentiation strategy  
           - Competitive advantages to highlight
           - Unique selling propositions
           - Market positioning approach
        
        6. CONTENT PRIORITIES:
           - Most important content sections
           - Secondary content priorities
           - Optional or future content ideas
           - Content freshness and update requirements
        
        Respond with valid JSON following the specified schema.
        """
        
        return prompt
    
    def _format_services(self, services: List[Dict[str, Any]]) -> str:
        """Format services for the prompt"""
        if not services:
            return "- No services specified"
        
        formatted = []
        for i, service in enumerate(services, 1):
            name = service.get("name", f"Service {i}")
            description = service.get("description", "No description")
            price = service.get("price", "Not specified")
            formatted.append(f"- {name}: {description} (Price: {price})")
        
        return "\n".join(formatted)
    
    def _format_features(self, features: List[str]) -> str:
        """Format website features for the prompt"""
        if not features:
            return "- No specific features requested"
        
        return "\n".join([f"- {feature}" for feature in features])
    
    def _get_analysis_schema(self) -> Dict[str, Any]:
        """Get JSON schema for requirements analysis"""
        return {
            "type": "object",
            "required": [
                "target_audience",
                "content_goals", 
                "messaging_strategy",
                "seo_keywords",
                "competitive_positioning",
                "content_priorities"
            ],
            "properties": {
                "target_audience": {
                    "type": "object",
                    "properties": {
                        "primary_persona": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "demographics": {"type": "object"},
                                "psychographics": {"type": "object"},
                                "pain_points": {"type": "array", "items": {"type": "string"}},
                                "goals": {"type": "array", "items": {"type": "string"}},
                                "behavior_patterns": {"type": "array", "items": {"type": "string"}}
                            }
                        },
                        "secondary_personas": {"type": "array"},
                        "user_journey": {"type": "array", "items": {"type": "string"}}
                    }
                },
                "content_goals": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "goal": {"type": "string"},
                            "priority": {"type": "string"},
                            "metrics": {"type": "array", "items": {"type": "string"}}
                        }
                    }
                },
                "messaging_strategy": {
                    "type": "object",
                    "properties": {
                        "value_proposition": {"type": "string"},
                        "key_messages": {"type": "array", "items": {"type": "string"}},
                        "tone_guidelines": {"type": "array", "items": {"type": "string"}},
                        "brand_voice": {"type": "string"}
                    }
                },
                "seo_keywords": {
                    "type": "object",
                    "properties": {
                        "primary": {"type": "array", "items": {"type": "string"}},
                        "secondary": {"type": "array", "items": {"type": "string"}},
                        "local": {"type": "array", "items": {"type": "string"}},
                        "long_tail": {"type": "array", "items": {"type": "string"}}
                    }
                },
                "competitive_positioning": {
                    "type": "object",
                    "properties": {
                        "differentiation_strategy": {"type": "string"},
                        "competitive_advantages": {"type": "array", "items": {"type": "string"}},
                        "unique_selling_propositions": {"type": "array", "items": {"type": "string"}},
                        "market_position": {"type": "string"}
                    }
                },
                "content_priorities": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "section": {"type": "string"},
                            "priority": {"type": "string"},
                            "importance_reason": {"type": "string"}
                        }
                    }
                }
            }
        }
    
    def _process_analysis(self, analysis_json: Dict[str, Any], wizard_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process and enhance the analysis with additional context"""
        
        # Add metadata
        analysis_json["analysis_metadata"] = {
            "created_at": datetime.utcnow().isoformat(),
            "analyzer_version": "1.0.0",
            "business_type": wizard_data.get("websiteType", {}).get("category", "unknown"),
            "has_services": len(wizard_data.get("selectedServices", [])) > 0,
            "has_location": bool(wizard_data.get("locationInfo", {}).get("city")),
            "features_count": len(wizard_data.get("websiteFeatures", [])),
        }
        
        # Enhance SEO keywords with business name
        business_name = wizard_data.get("businessInfo", {}).get("name", "")
        if business_name and "seo_keywords" in analysis_json:
            seo_keywords = analysis_json["seo_keywords"]
            if "primary" in seo_keywords and business_name.lower() not in [kw.lower() for kw in seo_keywords["primary"]]:
                seo_keywords["primary"].insert(0, business_name)
        
        # Add location-based keywords if applicable
        location_info = wizard_data.get("locationInfo", {})
        if location_info.get("city") and "seo_keywords" in analysis_json:
            city = location_info["city"]
            state = location_info.get("state", "")
            
            local_keywords = analysis_json["seo_keywords"].get("local", [])
            if city and f"{city}" not in local_keywords:
                local_keywords.append(f"{city}")
            if city and state and f"{city} {state}" not in local_keywords:
                local_keywords.append(f"{city} {state}")
                
            analysis_json["seo_keywords"]["local"] = local_keywords
        
        # Add content recommendations based on website type
        website_type = wizard_data.get("websiteType", {}).get("category", "")
        analysis_json["content_recommendations"] = self._get_content_recommendations(website_type)
        
        return analysis_json
    
    def _get_content_recommendations(self, website_type: str) -> Dict[str, Any]:
        """Get content recommendations based on website type"""
        
        recommendations = {
            "business": {
                "essential_pages": ["home", "about", "services", "contact"],
                "recommended_content": ["testimonials", "case_studies", "team", "faq"],
                "content_focus": ["trust_building", "service_explanation", "credibility"]
            },
            "portfolio": {
                "essential_pages": ["home", "portfolio", "about", "contact"],
                "recommended_content": ["project_details", "testimonials", "process", "blog"],
                "content_focus": ["visual_showcase", "expertise_demonstration", "creative_process"]
            },
            "ecommerce": {
                "essential_pages": ["home", "products", "cart", "checkout", "account"],
                "recommended_content": ["product_reviews", "buying_guides", "policies", "support"],
                "content_focus": ["product_benefits", "trust_signals", "purchase_facilitation"]
            },
            "blog": {
                "essential_pages": ["home", "blog", "about", "contact"],
                "recommended_content": ["categories", "archives", "author_bio", "newsletter"],
                "content_focus": ["valuable_content", "audience_engagement", "expertise_sharing"]
            },
            "nonprofit": {
                "essential_pages": ["home", "mission", "programs", "donate", "volunteer"],
                "recommended_content": ["impact_stories", "team", "events", "reports"],
                "content_focus": ["mission_communication", "impact_demonstration", "donation_encouragement"]
            }
        }
        
        return recommendations.get(website_type, recommendations["business"])
    
    async def validate_inputs(self, state: WorkflowState) -> List[str]:
        """Validate inputs for requirements analysis"""
        errors = []
        
        wizard_data = state.wizard_data
        
        # Check for essential data
        if not wizard_data.get("businessInfo", {}).get("name"):
            errors.append("Business name is required for analysis")
        
        if not wizard_data.get("websiteType", {}).get("category"):
            errors.append("Website type is required for analysis")
        
        if not wizard_data.get("websitePurpose", {}).get("primary"):
            errors.append("Website purpose is required for analysis")
        
        return errors
