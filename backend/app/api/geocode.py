from fastapi import APIRouter, Query, HTTPException, Depends
from app.services.geocoding import get_geocoding_client
from app.models.schemas import GeocodeResponse, ErrorResponse

router = APIRouter(prefix="/api", tags=["geocode"])


@router.get(
    "/geocode",
    response_model=GeocodeResponse,
    responses={400: {"model": ErrorResponse}, 502: {"model": ErrorResponse}},
)
async def geocode(
    q: str = Query("", max_length=200, description="Location query string"),
    client=Depends(get_geocoding_client),
) -> GeocodeResponse:
    if not q.strip():
        return GeocodeResponse(results=[], query=q)

    try:
        return await client.search(q.strip())
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Geocoding service unavailable: {str(e)}",
        )