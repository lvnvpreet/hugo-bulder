"""
API Endpoints Module
Contains FastAPI routers and endpoint definitions
"""

from .health import router as health_router
from .generation import router as generation_router

__all__ = ["health_router", "generation_router"]
