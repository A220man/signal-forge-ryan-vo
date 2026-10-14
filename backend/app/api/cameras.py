from fastapi import APIRouter, Query, HTTPException, Depends
from typing import Optional
from app.services.cameras import get_camera_service, close_camera_service
from app.models.schemas import CameraFeedResponse, ErrorResponse

router = APIRouter(prefix="/api", tags=["cameras"])


@router.get(
    "/cameras",
    response_model=CameraFeedResponse,
    responses={400: {"model": ErrorResponse}, 502: {"model": ErrorResponse}},
)
async def get_cameras(
    min_lat: Optional[float] = Query(None, ge=-90, le=90, description="Minimum latitude"),
    min_lng: Optional[float] = Query(None, ge=-180, le=180, description="Minimum longitude"),
    max_lat: Optional[float] = Query(None, ge=-90, le=90, description="Maximum latitude"),
    max_lng: Optional[float] = Query(None, ge=-180, le=180, description="Maximum longitude"),
    service=Depends(get_camera_service),
) -> CameraFeedResponse:
    """Get traffic camera feeds, optionally filtered by bounding box."""
    bbox = None
    if all(v is not None for v in (min_lat, min_lng, max_lat, max_lng)):
        if min_lat > max_lat or min_lng > max_lng:
            raise HTTPException(status_code=400, detail="Invalid bounding box coordinates")
        bbox = (min_lat, min_lng, max_lat, max_lng)

    try:
        return await service.get_cameras(bbox=bbox)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Camera service unavailable: {str(e)}",
        )


@router.get(
    "/cameras/{camera_id}/proxy",
    responses={404: {"model": ErrorResponse}, 502: {"model": ErrorResponse}},
)
async def proxy_camera_image(
    camera_id: str,
    service=Depends(get_camera_service),
):
    """Proxy a camera image to avoid CORS issues."""
    from fastapi.responses import StreamingResponse
    import httpx

    # Get camera list to find the requested camera
    response = await service.get_cameras()
    camera = next((c for c in response.cameras if c.id == camera_id), None)

    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    try:
        client = await service._get_client()
        upstream_response = await client.get(camera.image_url, follow_redirects=True)

        if upstream_response.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"Upstream camera returned {upstream_response.status_code}",
            )

        content_type = upstream_response.headers.get("content-type", "image/jpeg")

        return StreamingResponse(
            upstream_response.aiter_bytes(),
            media_type=content_type,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "public, max-age=30",
            },
        )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch camera image: {str(e)}",
        )