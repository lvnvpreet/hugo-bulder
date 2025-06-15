"""
Services Module
Contains core service classes for AI engine functionality
"""

from .ollama_client import OllamaClient
from .model_manager import ModelManager

__all__ = ["OllamaClient", "ModelManager"]
