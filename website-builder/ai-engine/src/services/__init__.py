"""
Services Package
Core service classes for AI engine functionality
"""

from .ollama_client import OllamaClient
from .model_manager import ModelManager
from .service_communication import ServiceCommunication

__all__ = [
    "OllamaClient",
    "ModelManager", 
    "ServiceCommunication"
]