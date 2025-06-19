"""
Helper Functions and Utilities
Common utility functions used across the AI Engine service
"""

import re
import hashlib
import json
import time
import asyncio
from typing import Any, Dict, List, Optional, Union
from datetime import datetime, timedelta
import uuid

def generate_id(prefix: str = "") -> str:
    """Generate a unique ID with optional prefix"""
    unique_id = str(uuid.uuid4())
    if prefix:
        return f"{prefix}_{unique_id}"
    return unique_id

def generate_request_id() -> str:
    """Generate a unique request ID for tracing"""
    timestamp = int(time.time() * 1000)
    unique = str(uuid.uuid4())[:8]
    return f"req_{timestamp}_{unique}"

def generate_generation_id() -> str:
    """Generate a unique generation ID"""
    return generate_id("gen")

def sanitize_filename(filename: str) -> str:
    """Sanitize filename for safe file operations"""
    # Remove or replace invalid characters
    sanitized = re.sub(r'[<>:"/\\|?*]', '_', filename)
    # Remove leading/trailing whitespace and dots
    sanitized = sanitized.strip(' .')
    # Limit length
    if len(sanitized) > 255:
        sanitized = sanitized[:255]
    return sanitized or "unnamed"

def create_slug(text: str) -> str:
    """Create URL-friendly slug from text"""
    # Convert to lowercase
    slug = text.lower()
    # Replace spaces and special characters with hyphens
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    # Remove leading/trailing hyphens
    slug = slug.strip('-')
    # Limit length
    if len(slug) > 50:
        slug = slug[:50].rstrip('-')
    return slug or "page"

def extract_keywords(text: str, max_keywords: int = 10) -> List[str]:
    """Extract keywords from text (simple implementation)"""
    # Remove punctuation and split into words
    words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
    
    # Common stop words to exclude
    stop_words = {
        'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
        'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
        'after', 'above', 'below', 'between', 'among', 'this', 'that', 'these',
        'those', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves',
        'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his',
        'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself',
        'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which',
        'who', 'whom', 'whose', 'why', 'how', 'all', 'any', 'both', 'each',
        'few', 'more', 'most', 'other', 'some', 'such', 'than', 'too', 'very'
    }
    
    # Filter out stop words and count frequency
    word_freq = {}
    for word in words:
        if word not in stop_words and len(word) > 2:
            word_freq[word] = word_freq.get(word, 0) + 1
    
    # Sort by frequency and return top keywords
    sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
    return [word for word, freq in sorted_words[:max_keywords]]

def calculate_readability_score(text: str) -> float:
    """Calculate simple readability score (0-100, higher is better)"""
    if not text:
        return 0.0
    
    # Count sentences, words, and syllables (simplified)
    sentences = len(re.findall(r'[.!?]+', text))
    words = len(re.findall(r'\b\w+\b', text))
    
    if sentences == 0 or words == 0:
        return 0.0
    
    # Simplified syllable counting
    syllables = 0
    for word in re.findall(r'\b\w+\b', text.lower()):
        vowels = 'aeiouy'
        syllable_count = 0
        prev_was_vowel = False
        
        for char in word:
            if char in vowels:
                if not prev_was_vowel:
                    syllable_count += 1
                prev_was_vowel = True
            else:
                prev_was_vowel = False
        
        # Every word has at least one syllable
        syllables += max(1, syllable_count)
    
    # Flesch Reading Ease formula (simplified)
    avg_sentence_length = words / sentences
    avg_syllables_per_word = syllables / words
    
    score = 206.835 - (1.015 * avg_sentence_length) - (84.6 * avg_syllables_per_word)
    
    # Clamp to 0-100 range
    return max(0.0, min(100.0, score))

def estimate_reading_time(text: str, words_per_minute: int = 200) -> int:
    """Estimate reading time in minutes"""
    word_count = len(re.findall(r'\b\w+\b', text))
    return max(1, round(word_count / words_per_minute))

def truncate_text(text: str, max_length: int, suffix: str = "...") -> str:
    """Truncate text to maximum length with suffix"""
    if len(text) <= max_length:
        return text
    
    truncated = text[:max_length - len(suffix)]
    
    # Try to break at word boundary
    last_space = truncated.rfind(' ')
    if last_space > max_length * 0.8:  # Don't break too early
        truncated = truncated[:last_space]
    
    return truncated + suffix

def hash_content(content: str) -> str:
    """Generate hash of content for caching/comparison"""
    return hashlib.sha256(content.encode()).hexdigest()[:16]

def format_duration(seconds: float) -> str:
    """Format duration in human-readable format"""
    if seconds < 1:
        return f"{seconds*1000:.0f}ms"
    elif seconds < 60:
        return f"{seconds:.1f}s"
    elif seconds < 3600:
        minutes = int(seconds // 60)
        remaining_seconds = int(seconds % 60)
        return f"{minutes}m {remaining_seconds}s"
    else:
        hours = int(seconds // 3600)
        remaining_minutes = int((seconds % 3600) // 60)
        return f"{hours}h {remaining_minutes}m"

def format_file_size(bytes: int) -> str:
    """Format file size in human-readable format"""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if bytes < 1024.0:
            return f"{bytes:.1f} {unit}"
        bytes /= 1024.0
    return f"{bytes:.1f} PB"

def validate_email(email: str) -> bool:
    """Validate email address format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_url(url: str) -> bool:
    """Validate URL format"""
    pattern = r'^https?://[^\s/$.?#].[^\s]*$'
    return re.match(pattern, url) is not None

def clean_html_tags(text: str) -> str:
    """Remove HTML tags from text"""
    return re.sub(r'<[^>]+>', '', text)

def extract_text_from_markdown(markdown: str) -> str:
    """Extract plain text from markdown"""
    # Remove markdown syntax
    text = re.sub(r'#{1,6}\s+', '', markdown)  # Headers
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)  # Bold
    text = re.sub(r'\*(.*?)\*', r'\1', text)  # Italic
    text = re.sub(r'`(.*?)`', r'\1', text)  # Code
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)  # Links
    text = re.sub(r'!\[([^\]]*)\]\([^\)]+\)', '', text)  # Images
    text = re.sub(r'^\s*[-\*\+]\s+', '', text, flags=re.MULTILINE)  # Lists
    text = re.sub(r'^\s*\d+\.\s+', '', text, flags=re.MULTILINE)  # Numbered lists
    
    return text.strip()

def merge_dictionaries(*dicts: Dict[str, Any]) -> Dict[str, Any]:
    """Merge multiple dictionaries with nested support"""
    result = {}
    
    for d in dicts:
        for key, value in d.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = merge_dictionaries(result[key], value)
            else:
                result[key] = value
    
    return result

def safe_json_loads(json_str: str, default: Any = None) -> Any:
    """Safely parse JSON string with fallback"""
    try:
        return json.loads(json_str)
    except (json.JSONDecodeError, TypeError):
        return default

def retry_async(max_retries: int = 3, delay: float = 1.0, backoff: float = 2.0):
    """Decorator for retrying async functions"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries:
                        await asyncio.sleep(delay * (backoff ** attempt))
                    else:
                        raise
            
            raise last_exception
        return wrapper
    return decorator

class Timer:
    """Context manager for timing operations"""
    
    def __init__(self, name: str = "Operation"):
        self.name = name
        self.start_time = None
        self.duration = None
    
    def __enter__(self):
        self.start_time = time.time()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.duration = time.time() - self.start_time
    
    def __str__(self):
        return f"{self.name}: {format_duration(self.duration)}"