"""
Healthcare Content Generation Service
Uses prompts from prompts.py to generate Universal Healthcare Theme content
"""

import asyncio
from typing import Dict, Any, Optional, List
import structlog
from datetime import datetime

from ..prompts import get_healthcare_prompt, get_specialty_guidance, HEALTHCARE_SUBCATEGORY_PROMPTS
from ..services.ollama_client import OllamaClient
from ..services.model_manager import ModelManager

logger = structlog.get_logger()

class HealthcareContentService:
    """Service for generating healthcare-specific content using specialized prompts"""
    
    def __init__(self, ollama_client: OllamaClient, model_manager: ModelManager):
        self.ollama_client = ollama_client
        self.model_manager = model_manager
        self.supported_subcategories = list(HEALTHCARE_SUBCATEGORY_PROMPTS.keys())
        
    async def generate_healthcare_content(
        self,
        business_name: str,
        subcategory: str,
        content_type: str,
        business_data: Dict[str, Any],
        model_name: str = "llama3.2:3b"
    ) -> Dict[str, Any]:
        """
        Generate healthcare content using specialized prompts
        
        Args:
            business_name: Name of the healthcare practice
            subcategory: Healthcare subcategory (dental, medical, veterinary, etc.)
            content_type: Type of content (homepage, about, service_page, etc.)
            business_data: Additional business information
            model_name: AI model to use for generation
            
        Returns:
            Dict with generated content and metadata
        """
        
        try:
            logger.info(f"🏥 Generating healthcare content", 
                       business_name=business_name, 
                       subcategory=subcategory, 
                       content_type=content_type)
            
            # Get the appropriate prompt
            prompt_data = get_healthcare_prompt(subcategory, content_type)
            
            # Prepare the prompt with business data
            formatted_prompt = self._format_prompt(prompt_data, business_name, subcategory, business_data)
            
            # Generate content using the AI model
            content = await self._generate_with_model(formatted_prompt, model_name)
            
            # Add healthcare-specific metadata
            metadata = self._generate_metadata(subcategory, content_type, business_data)
            
            logger.info(f"✅ Healthcare content generated successfully", 
                       content_length=len(content), 
                       subcategory=subcategory)
            
            return {
                "content": content,
                "metadata": metadata,
                "subcategory": subcategory,
                "content_type": content_type,
                "generated_at": datetime.now().isoformat(),
                "model_used": model_name
            }
            
        except Exception as e:
            logger.error(f"❌ Healthcare content generation failed", 
                        business_name=business_name, 
                        subcategory=subcategory, 
                        error=str(e))
            raise
    
    async def generate_service_page(
        self,
        business_name: str,
        subcategory: str,
        service_name: str,
        service_data: Dict[str, Any],
        model_name: str = "llama3.2:3b"
    ) -> Dict[str, Any]:
        """
        Generate a service page for a healthcare practice
        
        Args:
            business_name: Name of the healthcare practice
            subcategory: Healthcare subcategory
            service_name: Name of the specific service
            service_data: Service-specific information
            model_name: AI model to use
            
        Returns:
            Generated service page content
        """
        
        try:
            logger.info(f"🏥 Generating service page", 
                       business_name=business_name, 
                       subcategory=subcategory, 
                       service_name=service_name)
            
            # Get service page prompt
            prompt_data = get_healthcare_prompt(subcategory, "service_page", service_name)
            
            # Add service-specific data
            service_data["service_name"] = service_name
            service_data["business_name"] = business_name
            service_data["subcategory"] = subcategory
            
            # Get specialty guidance if available
            specialty = service_data.get("specialty", "")
            if specialty:
                specialty_guidance = get_specialty_guidance(subcategory, specialty)
                service_data["specialty_guidance"] = specialty_guidance
            
            # Format and generate
            formatted_prompt = self._format_prompt(prompt_data, business_name, subcategory, service_data)
            content = await self._generate_with_model(formatted_prompt, model_name)
            
            # Generate front matter for Hugo
            front_matter = self._generate_service_front_matter(subcategory, service_name, service_data)
            
            logger.info(f"✅ Service page generated successfully", 
                       service_name=service_name, 
                       content_length=len(content))
            
            return {
                "content": content,
                "front_matter": front_matter,
                "service_name": service_name,
                "subcategory": subcategory,
                "generated_at": datetime.now().isoformat(),
                "model_used": model_name
            }
            
        except Exception as e:
            logger.error(f"❌ Service page generation failed", 
                        service_name=service_name, 
                        error=str(e))
            raise
    
    async def generate_homepage(
        self,
        business_name: str,
        subcategory: str,
        business_data: Dict[str, Any],
        model_name: str = "llama3.2:3b"
    ) -> Dict[str, Any]:
        """Generate homepage content for healthcare practice"""
        
        return await self.generate_healthcare_content(
            business_name, subcategory, "homepage", business_data, model_name
        )
    
    async def generate_about_page(
        self,
        business_name: str,
        subcategory: str,
        business_data: Dict[str, Any],
        model_name: str = "llama3.2:3b"
    ) -> Dict[str, Any]:
        """Generate about page content for healthcare practice"""
        
        return await self.generate_healthcare_content(
            business_name, subcategory, "about", business_data, model_name
        )
    
    async def generate_contact_page(
        self,
        business_name: str,
        subcategory: str,
        business_data: Dict[str, Any],
        model_name: str = "llama3.2:3b"
    ) -> Dict[str, Any]:
        """Generate contact page content for healthcare practice"""
        
        return await self.generate_healthcare_content(
            business_name, subcategory, "contact", business_data, model_name
        )
    
    def _format_prompt(
        self, 
        prompt_data: Dict[str, str], 
        business_name: str, 
        subcategory: str, 
        business_data: Dict[str, Any]
    ) -> str:
        """Format the prompt template with business data"""
        
        system_prompt = prompt_data.get("system", "")
        template = prompt_data.get("template", "")
        
        # Prepare formatting data
        format_data = {
            "business_name": business_name,
            "subcategory": subcategory,
            **business_data
        }
        
        # Handle missing keys gracefully
        try:
            formatted_template = template.format(**format_data)
        except KeyError as e:
            logger.warning(f"Missing key in prompt formatting: {e}")
            # Use safe formatting that ignores missing keys
            formatted_template = template
            for key, value in format_data.items():
                placeholder = "{" + key + "}"
                if placeholder in formatted_template:
                    formatted_template = formatted_template.replace(placeholder, str(value))
        
        # Combine system prompt and formatted template
        full_prompt = f"{system_prompt}\n\n{formatted_template}"
        
        return full_prompt
    
    async def _generate_with_model(self, prompt: str, model_name: str) -> str:
        """Generate content using the AI model"""
        
        try:
            # Check if model is available
            if not await self.model_manager.is_model_available(model_name):
                logger.info(f"Model {model_name} not available, pulling...")
                await self.model_manager.pull_model(model_name)
            
            # Generate content
            response = await self.ollama_client.generate(
                model=model_name,
                prompt=prompt,
                options={
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "top_k": 40,
                    "max_tokens": 2000
                }
            )
            
            return response.get("response", "")
            
        except Exception as e:
            logger.error(f"Model generation failed: {e}")
            raise
    
    def _generate_metadata(self, subcategory: str, content_type: str, business_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate metadata for healthcare content"""
        
        metadata = {
            "healthcare_subcategory": subcategory,
            "content_type": content_type,
            "is_healthcare": True,
            "business_category": "healthcare",
            "schema_type": self._get_schema_type(subcategory),
            "specialties": business_data.get("specialties", []),
            "services": business_data.get("services", []),
            "location": business_data.get("location", ""),
            "contact_info": business_data.get("contact_info", {}),
            "insurance_accepted": business_data.get("insurance_accepted", True),
            "emergency_available": business_data.get("emergency_available", False),
            "appointment_required": business_data.get("appointment_required", True)
        }
        
        # Add subcategory-specific metadata
        if subcategory == "dental":
            metadata.update({
                "dental_specialties": business_data.get("dental_specialties", []),
                "cosmetic_services": business_data.get("cosmetic_services", False),
                "orthodontics": business_data.get("orthodontics", False),
                "oral_surgery": business_data.get("oral_surgery", False)
            })
        elif subcategory == "veterinary":
            metadata.update({
                "animal_types": business_data.get("animal_types", ["dogs", "cats"]),
                "emergency_hours": business_data.get("emergency_hours", False),
                "grooming_services": business_data.get("grooming_services", False),
                "boarding_available": business_data.get("boarding_available", False)
            })
        elif subcategory == "medical":
            metadata.update({
                "medical_specialties": business_data.get("medical_specialties", []),
                "telemedicine": business_data.get("telemedicine", False),
                "lab_services": business_data.get("lab_services", False),
                "imaging_services": business_data.get("imaging_services", [])
            })
        
        return metadata
    
    def _get_schema_type(self, subcategory: str) -> str:
        """Get schema.org type for healthcare subcategory"""
        
        schema_mapping = {
            "dental": "DentalOrganization",
            "medical": "MedicalOrganization",
            "veterinary": "VeterinaryOrganization",
            "mental_health": "MedicalOrganization",
            "optometry": "MedicalOrganization",
            "dermatology": "MedicalOrganization",
            "chiropractic": "MedicalOrganization"
        }
        
        return schema_mapping.get(subcategory, "MedicalOrganization")
    
    def _generate_service_front_matter(
        self, 
        subcategory: str, 
        service_name: str, 
        service_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate Hugo front matter for service pages"""
        
        front_matter = {
            "title": service_name,
            "description": service_data.get("description", f"{service_name} service"),
            "service_category": "healthcare",
            "healthcare_subcategory": subcategory,
            "draft": False,
            "date": datetime.now().isoformat(),
            "layout": "service"
        }
        
        # Add subcategory-specific front matter
        if subcategory == "dental":
            front_matter.update({
                "specialty": service_data.get("specialty", "General Dentistry"),
                "procedures": service_data.get("procedures", []),
                "sedation_available": service_data.get("sedation_available", False),
                "teeth_whitening": service_data.get("teeth_whitening", False),
                "orthodontics": service_data.get("orthodontics", False),
                "oral_surgery": service_data.get("oral_surgery", False)
            })
        elif subcategory == "veterinary":
            front_matter.update({
                "animal_types": service_data.get("animal_types", ["dogs", "cats"]),
                "emergency_hours": service_data.get("emergency_hours", False),
                "surgery_available": service_data.get("surgery_available", True),
                "grooming_services": service_data.get("grooming_services", False),
                "boarding_available": service_data.get("boarding_available", False)
            })
        elif subcategory == "medical":
            front_matter.update({
                "medical_specialty": service_data.get("specialty", "Family Medicine"),
                "board_certified": service_data.get("board_certified", True),
                "telemedicine": service_data.get("telemedicine", False),
                "lab_services": service_data.get("lab_services", False),
                "imaging_services": service_data.get("imaging_services", [])
            })
        
        # Add common healthcare fields
        front_matter.update({
            "duration": service_data.get("duration", ""),
            "booking_required": service_data.get("booking_required", True),
            "emergency_service": service_data.get("emergency_service", False),
            "insurance_accepted": service_data.get("insurance_accepted", True),
            "appointment_types": service_data.get("appointment_types", ["consultation", "follow-up"])
        })
        
        return front_matter
    
    def get_supported_subcategories(self) -> List[str]:
        """Get list of supported healthcare subcategories"""
        return self.supported_subcategories
    
    def is_subcategory_supported(self, subcategory: str) -> bool:
        """Check if a healthcare subcategory is supported"""
        return subcategory in self.supported_subcategories
