"""OIDC router stub."""

from fastapi import APIRouter

router = APIRouter(prefix="/api/oidc", tags=["oidc"])


@router.get("/protected")

async def protected_endpoint():
    """Protected endpoint that requires OIDC authentication (stub)."""
    return {"message": "Access granted (demo mode)"}
