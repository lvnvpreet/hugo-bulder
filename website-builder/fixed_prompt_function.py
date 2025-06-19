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
