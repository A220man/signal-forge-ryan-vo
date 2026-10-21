from .health import router as health_router
from .geocode import router as geocode_router
from .cameras import router as camera_router
from .voice import router as voice_router

__all__ = ["health_router", "geocode_router", "camera_router", "voice_router"]