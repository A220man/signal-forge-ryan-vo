from .health import router as health_router
from .geocode import router as geocode_router
from .cameras import router as camera_router

__all__ = ["health_router", "geocode_router", "camera_router"]