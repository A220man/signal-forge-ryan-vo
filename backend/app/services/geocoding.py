import asyncio
import time
from typing import Optional
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.core.config import get_settings
from app.models.schemas import GeocodeResult, GeocodeResponse


class NominatimClient:
    def __init__(self):
        self.settings = get_settings()
        self._client: Optional[httpx.AsyncClient] = None
        self._cache: dict[str, tuple[GeocodeResponse, float]] = {}
        self._last_request_time: float = 0.0
        self._rate_limit_lock = asyncio.Lock()

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.settings.nominatim_base_url,
                headers={"User-Agent": self.settings.nominatim_user_agent},
                timeout=httpx.Timeout(10.0, connect=5.0),
            )
        return self._client

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    def _get_cache_key(self, query: str) -> str:
        return query.lower().strip()

    def _is_cache_valid(self, cached_at: float) -> bool:
        return (time.time() - cached_at) < self.settings.geocode_cache_ttl

    async def _rate_limit(self):
        async with self._rate_limit_lock:
            now = time.time()
            min_interval = 1.0 / self.settings.nominatim_rate_limit
            elapsed = now - self._last_request_time
            if elapsed < min_interval:
                await asyncio.sleep(min_interval - elapsed)
            self._last_request_time = time.time()

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=0.5, min=0.5, max=4),
        retry=retry_if_exception_type((httpx.RequestError, httpx.HTTPStatusError)),
        reraise=True,
    )
    async def _fetch(self, query: str) -> list[dict]:
        await self._rate_limit()
        client = await self._get_client()
        params = {
            "q": query,
            "format": "json",
            "addressdetails": 1,
            "limit": 10,
            "accept-language": "en",
        }
        response = await client.get("/search", params=params)
        response.raise_for_status()
        return response.json()

    async def search(self, query: str) -> GeocodeResponse:
        if not query or not query.strip():
            return GeocodeResponse(results=[], query=query)

        cache_key = self._get_cache_key(query)
        if cache_key in self._cache:
            cached_response, cached_at = self._cache[cache_key]
            if self._is_cache_valid(cached_at):
                cached_response.cached = True
                return cached_response

        raw_results = await self._fetch(query.strip())
        results = [GeocodeResult(**r) for r in raw_results]
        response = GeocodeResponse(results=results, query=query, cached=False)
        self._cache[cache_key] = (response, time.time())
        return response


_geocoding_client: Optional[NominatimClient] = None


def get_geocoding_client() -> NominatimClient:
    global _geocoding_client
    if _geocoding_client is None:
        _geocoding_client = NominatimClient()
    return _geocoding_client


async def close_geocoding_client():
    global _geocoding_client
    if _geocoding_client:
        await _geocoding_client.close()
        _geocoding_client = None