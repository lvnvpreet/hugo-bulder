"""
Healthcare Content Generation Prompts
Universal Healthcare Theme with subcategory-specific prompts
"""

# Base healthcare prompts that apply to all healthcare subcategories
HEALTHCARE_BASE_PROMPTS = {
    "homepage": {
        "system": """You are a healthcare content expert specializing in creating professional, trustworthy, and patient-focused website content. 
Always prioritize patient care, safety, and professionalism. Use medical terminology appropriately but keep content accessible to patients.""",
        
        "template": """Create compelling homepage content for a {subcategory} practice called "{business_name}".

Business Details:
- Name: {business_name}
- Type: {subcategory} healthcare practice
- Location: {location}
- Contact: {contact_info}
- Services: {services}

Content Requirements:
- Professional yet warm and welcoming tone
- Emphasize patient care and expertise
- Include trust-building elements (certifications, experience)
- Highlight key services and specialties
- Include clear call-to-action for appointments
- Address common patient concerns
- Use appropriate medical terminology while remaining accessible

Structure:
1. Compelling headline emphasizing care quality
2. Brief introduction highlighting expertise
3. Key services overview
4. Trust indicators (certifications, experience, technology)
5. Patient-focused benefits
6. Clear contact and appointment information

Tone: Professional, caring, trustworthy, expert""",
    },
    
    "about": {
        "system": """You are creating an About page for a healthcare practice. Focus on building trust, highlighting qualifications, 
and showing the human side of healthcare providers while maintaining professionalism.""",
        
        "template": """Create an About page for "{business_name}", a {subcategory} practice.

Business Details:
- Name: {business_name}
- Specialty: {subcategory}
- Location: {location}
- Years in practice: {experience_years}
- Team size: {team_size}
- Philosophy: {care_philosophy}

Content Requirements:
- Highlight practitioner qualifications and experience
- Emphasize commitment to patient care
- Include practice philosophy and approach
- Mention advanced technology or techniques used
- Show the human side while maintaining professionalism
- Include education and certifications
- Highlight what makes this practice unique

Structure:
1. Practice mission and philosophy
2. Practitioner background and qualifications
3. Team introduction (if applicable)
4. Technology and modern approaches
5. Community involvement
6. Why patients choose this practice

Tone: Professional, personal, trustworthy, expert""",
    },
    
    "contact": {
        "system": """Create helpful contact information for a healthcare practice that makes it easy for patients to reach out and understand the process.""",
        
        "template": """Create contact page content for "{business_name}", a {subcategory} practice.

Contact Information:
- Phone: {phone}
- Email: {email}
- Address: {address}
- Emergency line: {emergency_contact}
- Hours: {business_hours}

Content Requirements:
- Clear contact information prominently displayed
- Appointment scheduling process
- Emergency contact procedures
- Insurance and payment information
- Location details and directions
- Patient portal or online services
- What to expect for first visit

Structure:
1. Primary contact information
2. Office hours and scheduling
3. Emergency procedures
4. Location and parking information
5. Insurance and payments
6. Patient resources
7. Appointment preparation

Tone: Helpful, clear, professional""",
    }
}

# Subcategory-specific prompts for different healthcare types
HEALTHCARE_SUBCATEGORY_PROMPTS = {
    "dental": {
        "service_page": {
            "system": """You are a dental content expert. Create informative, reassuring content that addresses common dental concerns 
and emphasizes modern, pain-free techniques and preventive care.""",
            
            "template": """Create a service page for "{service_name}" at "{business_name}", a dental practice.

Service Details:
- Service: {service_name}
- Description: {service_description}
- Duration: {duration}
- Procedures included: {procedures}
- Technology used: {technology}
- Insurance coverage: {insurance_info}

Content Requirements:
- Explain the procedure in patient-friendly terms
- Address common fears and concerns
- Highlight modern, pain-free techniques
- Emphasize preventive benefits
- Include aftercare instructions overview
- Mention technology and equipment used
- Clear pricing and insurance information

Focus Areas for Dental Content:
- Pain management and comfort
- Modern dental technology (digital X-rays, laser dentistry)
- Preventive care benefits
- Cosmetic and functional outcomes
- Patient comfort and anxiety management

Structure:
1. Service overview and benefits
2. What to expect during treatment
3. Technology and techniques used
4. Pre and post-care instructions
5. Pricing and insurance
6. FAQ section addressing common concerns

Tone: Reassuring, professional, educational, comfort-focused""",
        },
        
        "specialty_content": {
            "cosmetic_dentistry": "Focus on smile transformation, confidence building, and aesthetic outcomes. Highlight before/after possibilities and modern techniques.",
            "orthodontics": "Emphasize straight teeth benefits, treatment options (traditional braces, Invisalign), and long-term oral health improvements.",
            "oral_surgery": "Address procedure safety, pain management, recovery process, and when surgical intervention is necessary.",
            "preventive_care": "Focus on long-term oral health, early detection benefits, and maintaining healthy teeth and gums.",
            "pediatric_dentistry": "Emphasize child-friendly environment, early dental health education, and making dental visits fun and comfortable."
        }
    },
    
    "medical": {
        "service_page": {
            "system": """You are a medical content expert. Create comprehensive, evidence-based content that explains medical services 
while being accessible to patients and emphasizing preventive care.""",
            
            "template": """Create a service page for "{service_name}" at "{business_name}", a medical practice.

Service Details:
- Service: {service_name}
- Specialty: {medical_specialty}
- Target conditions: {conditions_treated}
- Diagnostic tools: {diagnostic_equipment}
- Treatment approaches: {treatment_methods}
- Follow-up care: {follow_up_process}

Content Requirements:
- Explain medical procedures clearly without medical jargon
- Emphasize preventive care and early detection
- Include when to seek this service
- Highlight diagnostic capabilities
- Explain treatment approach and options
- Address common patient questions
- Include preparation instructions

Focus Areas for Medical Content:
- Preventive healthcare and wellness
- Early detection and screening
- Evidence-based treatment approaches
- Patient education and self-care
- Chronic disease management
- Coordination of care

Structure:
1. Service purpose and benefits
2. Who should consider this service
3. What the appointment includes
4. Diagnostic procedures and tests
5. Treatment options available
6. Follow-up care and monitoring

Tone: Professional, educational, reassuring, evidence-based""",
        },
        
        "specialty_content": {
            "family_medicine": "Focus on comprehensive care for all ages, preventive health, and long-term patient relationships.",
            "internal_medicine": "Emphasize adult disease prevention, chronic condition management, and complex medical problem solving.",
            "urgent_care": "Highlight convenient, prompt care for non-emergency conditions and when to choose urgent care over ER.",
            "wellness_exams": "Focus on preventive care, health screening, and maintaining optimal health through regular check-ups.",
            "chronic_care": "Emphasize ongoing support, lifestyle management, and improving quality of life with chronic conditions."
        }
    },
    
    "veterinary": {
        "service_page": {
            "system": """You are a veterinary content expert. Create compassionate, informative content that addresses pet owner concerns 
and emphasizes the human-animal bond and comprehensive pet care.""",
            
            "template": """Create a service page for "{service_name}" at "{business_name}", a veterinary clinic.

Service Details:
- Service: {service_name}
- Animal types: {animal_types}
- Procedures included: {procedures}
- Emergency availability: {emergency_hours}
- Specialized equipment: {equipment}
- Follow-up care: {aftercare}

Content Requirements:
- Address pet owner concerns and emotions
- Explain procedures in understandable terms
- Emphasize pet comfort and pain management
- Include what pet owners can expect
- Highlight experienced, compassionate care
- Mention modern veterinary technology
- Provide clear preparation instructions

Focus Areas for Veterinary Content:
- Pet health and wellness
- Preventive care (vaccinations, check-ups)
- Emergency and urgent care
- Pain management and comfort
- Owner education and involvement
- Modern veterinary medicine advances

Structure:
1. Service overview and importance for pet health
2. What happens during the appointment/procedure
3. Pet comfort measures and pain management
4. Owner involvement and preparation
5. Recovery and aftercare instructions
6. When to seek this service

Tone: Compassionate, professional, pet-focused, educational""",
        },
        
        "specialty_content": {
            "wellness_exams": "Focus on preventive care, early detection of health issues, and maintaining pet health throughout their life stages.",
            "emergency_care": "Emphasize 24/7 availability, rapid response, and handling urgent pet health situations with expertise.",
            "surgery": "Address safety protocols, pain management, modern surgical techniques, and comprehensive pre/post-operative care.",
            "dental_care": "Highlight pet dental health importance, professional cleaning, and home dental care recommendations.",
            "grooming": "Focus on hygiene, comfort, and the health benefits of professional grooming services."
        }
    },
    
    "mental_health": {
        "service_page": {
            "system": """You are a mental health content expert. Create supportive, non-stigmatizing content that encourages help-seeking 
and emphasizes hope, healing, and professional support.""",
            
            "template": """Create a service page for "{service_name}" at "{business_name}", a mental health practice.

Service Details:
- Service: {service_name}
- Therapy type: {therapy_type}
- Specializations: {specializations}
- Session format: {session_format}
- Age groups served: {age_groups}
- Crisis support: {crisis_availability}

Content Requirements:
- Use non-stigmatizing, hopeful language
- Explain therapy approach and techniques
- Address common myths and concerns
- Emphasize confidentiality and safety
- Include what to expect in sessions
- Highlight positive outcomes and hope
- Provide crisis resources if needed

Focus Areas for Mental Health Content:
- Destigmatizing mental health treatment
- Evidence-based therapeutic approaches
- Creating safe, supportive environments
- Personal growth and healing
- Coping strategies and resilience
- Work-life balance and wellness

Structure:
1. Service description and who it helps
2. Therapeutic approach and techniques
3. What to expect in sessions
4. Benefits and positive outcomes
5. Getting started and appointment process
6. Crisis resources and support

Tone: Supportive, hopeful, professional, non-judgmental""",
        },
        
        "specialty_content": {
            "individual_therapy": "Focus on personal growth, overcoming challenges, and developing coping strategies in a safe environment.",
            "couples_therapy": "Emphasize relationship strengthening, communication skills, and working through challenges together.",
            "family_therapy": "Highlight family dynamics, improving communication, and creating healthier family relationships.",
            "group_therapy": "Focus on peer support, shared experiences, and learning from others facing similar challenges.",
            "crisis_intervention": "Emphasize immediate support, safety, and connecting people with ongoing resources."
        }
    },
    
    "optometry": {
        "service_page": {
            "system": """You are an eye care content expert. Create informative content about vision and eye health that emphasizes 
the importance of regular eye care and advanced diagnostic capabilities.""",
            
            "template": """Create a service page for "{service_name}" at "{business_name}", an optometry practice.

Service Details:
- Service: {service_name}
- Eye conditions treated: {conditions}
- Diagnostic equipment: {equipment}
- Vision correction options: {correction_options}
- Age groups served: {age_groups}
- Follow-up care: {follow_up}

Content Requirements:
- Explain importance of regular eye exams
- Describe diagnostic procedures and technology
- Address common vision problems
- Highlight early detection benefits
- Include vision correction options
- Emphasize comprehensive eye health
- Provide clear preparation instructions

Focus Areas for Optometry Content:
- Comprehensive eye health and vision care
- Early detection of eye diseases
- Modern diagnostic technology
- Vision correction options (glasses, contacts, surgery referrals)
- Pediatric and senior eye care
- Digital eye strain and modern lifestyle impacts

Structure:
1. Service importance for eye health
2. Comprehensive examination process
3. Diagnostic technology and procedures
4. Vision correction options
5. Treatment for eye conditions
6. Ongoing eye health maintenance

Tone: Professional, educational, health-focused, reassuring""",
        },
        
        "specialty_content": {
            "comprehensive_exams": "Focus on thorough eye health assessment, early disease detection, and vision optimization.",
            "contact_lenses": "Emphasize proper fitting, comfort, safety, and various lens options for different lifestyles.",
            "pediatric_care": "Highlight early vision development, school vision needs, and making eye exams comfortable for children.",
            "disease_management": "Focus on monitoring and managing conditions like glaucoma, diabetic retinopathy, and macular degeneration.",
            "vision_therapy": "Explain therapeutic approaches to improving visual skills and addressing vision-related learning issues."
        }
    }
}

# Service-specific prompts that can be used across healthcare types
SERVICE_PROMPTS = {
    "appointment_booking": {
        "system": "Create clear, helpful instructions for booking appointments that reduce barriers and encourage patients to schedule.",
        "template": """Create appointment booking content for {business_name}.

Booking Information:
- Phone: {phone}
- Online booking: {online_booking_available}
- Emergency contact: {emergency_contact}
- New patient process: {new_patient_process}
- Insurance verification: {insurance_process}

Content should include:
1. Multiple ways to schedule appointments
2. What information patients need to provide
3. Insurance verification process
4. Cancellation and rescheduling policies
5. Emergency contact procedures
6. New patient welcome information

Tone: Helpful, clear, welcoming"""
    },
    
    "insurance_payment": {
        "system": "Create clear financial information that helps patients understand costs and payment options.",
        "template": """Create insurance and payment information for {business_name}.

Financial Details:
- Insurance plans accepted: {insurance_plans}
- Payment options: {payment_methods}
- Payment plans available: {payment_plans}
- Estimate process: {cost_estimates}
- Financial assistance: {financial_aid}

Content should include:
1. Insurance plans accepted
2. Payment methods and options
3. Cost estimate process
4. Payment plan availability
5. Financial assistance programs
6. Billing and collections policies

Tone: Clear, transparent, helpful"""
    },
    
    "emergency_care": {
        "system": "Create urgent care information that helps patients know when and how to seek emergency treatment.",
        "template": """Create emergency care information for {business_name}.

Emergency Details:
- Emergency phone: {emergency_phone}
- After-hours availability: {after_hours}
- Emergency procedures: {emergency_protocols}
- When to call 911: {emergency_situations}
- Hospital partnerships: {hospital_affiliations}

Content should include:
1. When to seek emergency care
2. Emergency contact procedures
3. After-hours availability
4. What constitutes a true emergency
5. Hospital partnerships and referrals
6. Insurance considerations for emergencies

Tone: Urgent, clear, helpful, reassuring"""
    }
}

# Utility functions for prompt selection
def get_healthcare_prompt(subcategory: str, content_type: str, service_name: str = None) -> dict:
    """
    Get the appropriate prompt for healthcare content generation
    
    Args:
        subcategory: Healthcare subcategory (dental, medical, veterinary, etc.)
        content_type: Type of content (homepage, about, service_page, etc.)
        service_name: Specific service if generating service page
    
    Returns:
        Dict containing system prompt and template
    """
    
    # Try to get subcategory-specific prompt first
    if subcategory in HEALTHCARE_SUBCATEGORY_PROMPTS:
        subcategory_prompts = HEALTHCARE_SUBCATEGORY_PROMPTS[subcategory]
        if content_type in subcategory_prompts:
            return subcategory_prompts[content_type]
    
    # Fall back to base healthcare prompts
    if content_type in HEALTHCARE_BASE_PROMPTS:
        return HEALTHCARE_BASE_PROMPTS[content_type]
    
    # Fall back to service prompts
    if content_type in SERVICE_PROMPTS:
        return SERVICE_PROMPTS[content_type]
    
    # Default fallback
    return {
        "system": "You are a healthcare content expert creating professional, patient-focused content.",
        "template": "Create {content_type} content for {business_name}, a {subcategory} healthcare practice. Focus on patient care, professionalism, and clear communication."
    }

def get_specialty_guidance(subcategory: str, specialty: str) -> str:
    """
    Get specialty-specific content guidance
    
    Args:
        subcategory: Healthcare subcategory
        specialty: Specific specialty within subcategory
    
    Returns:
        Specialty-specific guidance string
    """
    if subcategory in HEALTHCARE_SUBCATEGORY_PROMPTS:
        specialty_content = HEALTHCARE_SUBCATEGORY_PROMPTS[subcategory].get("specialty_content", {})
        return specialty_content.get(specialty, "Focus on professional, evidence-based content for this specialty.")
    
    return "Focus on professional, evidence-based content for this healthcare specialty."

# Example usage and testing
if __name__ == "__main__":
    # Test prompt retrieval
    dental_homepage = get_healthcare_prompt("dental", "homepage")
    print("Dental Homepage Prompt:", dental_homepage["template"][:100] + "...")
    
    vet_service = get_healthcare_prompt("veterinary", "service_page")
    print("Veterinary Service Prompt:", vet_service["template"][:100] + "...")
    
    specialty_guidance = get_specialty_guidance("dental", "cosmetic_dentistry")
    print("Cosmetic Dentistry Guidance:", specialty_guidance)
