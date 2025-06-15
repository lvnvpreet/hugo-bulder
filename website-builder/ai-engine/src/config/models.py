"""
Model Configuration
Defines available models and their recommended use cases
"""

from typing import Dict, Any, List

# Model configuration with recommended models for different tasks
MODELS_CONFIG = {
    "content_generation": {
        "primary": "llama3.1:8b",
        "fallback": "mistral:7b",
        "description": "Best for content creation and writing",
        "recommended_temperature": 0.8,
        "max_tokens": 2000,
    },
    "code_generation": {
        "primary": "codellama:13b",
        "fallback": "llama3.1:8b", 
        "description": "Optimized for code and technical content",
        "recommended_temperature": 0.3,
        "max_tokens": 4000,
    },
    "structured_data": {
        "primary": "mistral:7b",
        "fallback": "llama3.1:8b",
        "description": "Good for JSON and structured output",
        "recommended_temperature": 0.2,
        "max_tokens": 1500,
    },
    "creative_writing": {
        "primary": "llama3.1:8b",
        "fallback": "mistral:7b",
        "description": "Creative and engaging content",
        "recommended_temperature": 0.9,
        "max_tokens": 3000,
    },
    "analysis": {
        "primary": "llama3.1:8b",
        "fallback": "mistral:7b",
        "description": "Analysis and reasoning tasks",
        "recommended_temperature": 0.3,
        "max_tokens": 2000,
    },
    "seo_optimization": {
        "primary": "mistral:7b",
        "fallback": "llama3.1:8b",
        "description": "SEO metadata and optimization",
        "recommended_temperature": 0.4,
        "max_tokens": 1000,
    }
}

# Essential models that should be downloaded on startup
ESSENTIAL_MODELS = [
    "llama3.1:8b",
    "mistral:7b",
]

# Optional models that can be downloaded on demand
OPTIONAL_MODELS = [
    "codellama:13b",
    "llama3.1:70b",  # For high-quality content when resources allow
    "phi3:mini",     # Lightweight option
]

# Model aliases for backward compatibility
MODEL_ALIASES = {
    "llama3:8b": "llama3.1:8b",
    "llama3": "llama3.1:8b",
    "mistral": "mistral:7b",
    "codellama": "codellama:13b",
}

# Model specifications and requirements
MODEL_SPECS = {
    "llama3.1:8b": {
        "size_gb": 4.7,
        "params": "8B",
        "context_length": 128000,
        "recommended_ram_gb": 8,
        "good_for": ["general", "content", "analysis", "creative"],
    },
    "mistral:7b": {
        "size_gb": 4.1,
        "params": "7B", 
        "context_length": 32768,
        "recommended_ram_gb": 6,
        "good_for": ["structured", "seo", "concise"],
    },
    "codellama:13b": {
        "size_gb": 7.4,
        "params": "13B",
        "context_length": 16384,
        "recommended_ram_gb": 12,
        "good_for": ["code", "technical", "programming"],
    },
    "phi3:mini": {
        "size_gb": 2.2,
        "params": "3.8B",
        "context_length": 128000,
        "recommended_ram_gb": 4,
        "good_for": ["lightweight", "quick", "basic"],
    },
}

def get_model_for_task(task_type: str) -> Dict[str, Any]:
    """Get the recommended model configuration for a specific task type"""
    return MODELS_CONFIG.get(task_type, MODELS_CONFIG["content_generation"])

def get_primary_model(task_type: str) -> str:
    """Get the primary model name for a task type"""
    config = get_model_for_task(task_type)
    return config["primary"]

def get_fallback_model(task_type: str) -> str:
    """Get the fallback model name for a task type"""
    config = get_model_for_task(task_type)
    return config["fallback"]

def resolve_model_alias(model_name: str) -> str:
    """Resolve model alias to actual model name"""
    return MODEL_ALIASES.get(model_name, model_name)

def get_model_specs(model_name: str) -> Dict[str, Any]:
    """Get specifications for a model"""
    resolved_name = resolve_model_alias(model_name)
    return MODEL_SPECS.get(resolved_name, {})

def get_recommended_settings(task_type: str) -> Dict[str, Any]:
    """Get recommended generation settings for a task type"""
    config = get_model_for_task(task_type)
    return {
        "temperature": config.get("recommended_temperature", 0.7),
        "max_tokens": config.get("max_tokens", 2000),
        "model": config["primary"],
    }

def estimate_memory_requirements(models: List[str]) -> Dict[str, Any]:
    """Estimate memory requirements for a list of models"""
    total_size_gb = 0
    total_ram_gb = 0
    model_details = []
    
    for model in models:
        resolved_model = resolve_model_alias(model)
        specs = get_model_specs(resolved_model)
        
        if specs:
            size = specs.get("size_gb", 0)
            ram = specs.get("recommended_ram_gb", 0)
            
            total_size_gb += size
            total_ram_gb = max(total_ram_gb, ram)  # RAM is not additive, use max
            
            model_details.append({
                "model": resolved_model,
                "size_gb": size,
                "ram_gb": ram,
                "params": specs.get("params", "Unknown"),
            })
    
    return {
        "total_disk_space_gb": round(total_size_gb, 1),
        "recommended_ram_gb": total_ram_gb,
        "models": model_details,
        "can_run_simultaneously": total_ram_gb <= 32,  # Assume 32GB system limit
    }

# Model download priority (higher number = higher priority)
MODEL_PRIORITY = {
    "llama3.1:8b": 100,
    "mistral:7b": 90,
    "codellama:13b": 70,
    "phi3:mini": 60,
    "llama3.1:70b": 30,
}

def get_download_order(models: List[str]) -> List[str]:
    """Get models sorted by download priority"""
    return sorted(models, key=lambda x: MODEL_PRIORITY.get(resolve_model_alias(x), 0), reverse=True)

# Default system prompts for different task types
SYSTEM_PROMPTS = {
    "content_generation": """You are a professional content writer specializing in website copy. 
Create engaging, clear, and compelling content that resonates with the target audience. 
Focus on benefits, use active voice, and maintain a professional yet approachable tone.""",
    
    "seo_optimization": """You are an SEO specialist. Create SEO-optimized content and metadata 
that will rank well in search engines while maintaining readability and user value. 
Focus on relevant keywords, proper meta descriptions, and structured data.""",
    
    "structured_data": """You are a data structuring expert. Create well-formatted JSON 
and structured data that follows specified schemas. Ensure all required fields are present 
and data types are correct. Return only valid JSON without additional text.""",
    
    "analysis": """You are a business analyst. Analyze the provided information thoroughly 
and provide insights, recommendations, and strategic guidance. Be objective, thorough, 
and provide actionable recommendations.""",
    
    "creative_writing": """You are a creative writer. Create engaging, imaginative, and 
compelling content that captures attention and tells a story. Use vivid language, 
vary sentence structure, and create emotional connections with readers.""",
}

def get_system_prompt(task_type: str) -> str:
    """Get the system prompt for a specific task type"""
    return SYSTEM_PROMPTS.get(task_type, SYSTEM_PROMPTS["content_generation"])
