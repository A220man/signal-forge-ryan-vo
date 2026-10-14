import asyncio
import time
from datetime import datetime
from typing import Optional
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.core.config import get_settings
from app.models.schemas import CameraFeed, CameraFeedResponse, CameraStatus


# Mock camera data for development - in production this would come from a real API
MOCK_CAMERAS = [
    {
        "id": "austin-congress-1",
        "name": "Congress Ave Bridge",
        "lat": 30.2608,
        "lng": -97.7431,
        "image_url": "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=640&h=480&fit=crop",
        "source": "demo",
        "attribution": "Demo camera - Unsplash",
    },
    {
        "id": "austin-6th-st",
        "name": "6th Street",
        "lat": 30.2676,
        "lng": -97.7429,
        "image_url": "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=640&h=480&fit=crop",
        "source": "demo",
        "attribution": "Demo camera - Unsplash",
    },
    {
        "id": "london-tower-bridge",
        "name": "Tower Bridge",
        "lat": 51.5055,
        "lng": -0.0754,
        "image_url": "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=640&h=480&fit=crop",
        "source": "demo",
        "attribution": "Demo camera - Unsplash",
    },
    {
        "id": "nyc-times-square",
        "name": "Times Square",
        "lat": 40.758,
        "lng": -73.9855,
        "image_url": "https://images.unsplash.com/photo-1542594452-0d9788d32c4b?w=640&h=480&fit=crop",
        "source": "demo",
        "attribution": "Demo camera - Unsplash",
    },
    {
        "id": "sf-golden-gate",
        "name": "Golden Gate Bridge",
        "lat": 37.8199,
        "lng": -122.4783,
        "image_url": "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=640&h=480&fit=crop",
        "source": "demo",
        "attribution": "Demo camera - Unsplash",
    },
]


class CameraService:
    def __init__(self):
        self.settings = get_settings()
        self._client: Optional[httpx.AsyncClient] = None
        self._cache: dict[str, tuple[list[CameraFeed], float]] = {}
        self._cache_ttl = 300  # 5 minutes
        self._health_cache: dict[str, tuple[CameraStatus, float]] = {}
        self._health_ttl = 60  # 1 minute
        self._health_check_enabled = True

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(10.0, connect=5.0),
                headers={"User-Agent": self.settings.nominatim_user_agent},
            )
        return self._client

    async def close(self):
        if self._client and not self._client.is_closed:
            try:
                await self._client.aclose()
            except RuntimeError:
                # Event loop may be closed during test teardown
                pass
            self._client = None

    def _get_cache_key(self, bbox: Optional[tuple[float, float, float, float]] = None) -> str:
        if bbox:
            return f"bbox:{bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]}"
        return "all"

    def _is_cache_valid(self, cached_at: float) -> bool:
        return (time.time() - cached_at) < self._cache_ttl

    def _is_health_valid(self, cached_at: float) -> bool:
        return (time.time() - cached_at) < self._health_ttl

    def disable_health_checks(self):
        """Disable health checks for testing."""
        self._health_check_enabled = False

    @retry(
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=0.5, min=0.5, max=2),
        retry=retry_if_exception_type((httpx.RequestError, httpx.HTTPStatusError)),
    )
    async def _check_camera_health(self, image_url: str) -> CameraStatus:
        """Check if a camera feed is accessible via HEAD request."""
        if not self._health_check_enabled:
            return CameraStatus.UNKNOWN
        try:
            client = await self._get_client()
            response = await client.head(image_url, follow_redirects=True)
            if response.status_code == 200:
                content_type = response.headers.get("content-type", "")
                if content_type.startswith("image/"):
                    return CameraStatus.ACTIVE
            return CameraStatus.INACTIVE
        except Exception:
            return CameraStatus.INACTIVE

    async def get_cameras(
        self,
        bbox: Optional[tuple[float, float, float, float]] = None,
        force_refresh: bool = False,
    ) -> CameraFeedResponse:
        """Get camera feeds, optionally filtered by bounding box."""
        cache_key = self._get_cache_key(bbox)

        if not force_refresh and cache_key in self._cache:
            cached_data, cached_at = self._cache[cache_key]
            if self._is_cache_valid(cached_at):
                # Update health status from health cache
                updated_cameras = []
                for cam in cached_data:
                    health_key = cam.image_url
                    if health_key in self._health_cache:
                        health_status, health_cached_at = self._health_cache[health_key]
                        if self._is_health_valid(health_cached_at):
                            cam = cam.model_copy(update={"status": health_status, "last_checked": health_cached_at})
                    updated_cameras.append(cam)
                return CameraFeedResponse(cameras=updated_cameras, cached=True)

        # Load mock data (in production, fetch from real API)
        cameras = []
        for cam_data in MOCK_CAMERAS:
            if bbox:
                min_lat, min_lng, max_lat, max_lng = bbox
                if not (min_lat <= cam_data["lat"] <= max_lat and min_lng <= cam_data["lng"] <= max_lng):
                    continue

            cam = CameraFeed(**cam_data)
            cameras.append(cam)

        # Check health for all cameras
        if self._health_check_enabled:
            health_results = await asyncio.gather(
                *[self._check_camera_health(cam.image_url) for cam in cameras],
                return_exceptions=True,
            )

            for cam, health in zip(cameras, health_results):
                if isinstance(health, CameraStatus):
                    cam.status = health
                    cam.last_checked = datetime.utcnow()
                    self._health_cache[cam.image_url] = (health, time.time())
        else:
            for cam in cameras:
                cam.status = CameraStatus.UNKNOWN

        self._cache[cache_key] = (cameras, time.time())

        return CameraFeedResponse(cameras=cameras, cached=False)


_camera_service: Optional[CameraService] = None


def get_camera_service() -> CameraService:
    global _camera_service
    if _camera_service is None:
        _camera_service = CameraService()
    return _camera_service


async def close_camera_service():
    global _camera_service
    if _camera_service is not None:
        await _camera_service.close()
        _camera_service = None