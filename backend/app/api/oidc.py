"""OIDC authentication router with Keycloak JWT validation."""

from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel, Field
from typing import Optional
import json
import base64
import jwt

from app.core.config import get_settings

router = APIRouter(prefix="/api/oidc", tags=["oidc"])

# ---- Keycloak configuration from Settings ----
_settings = get_settings()

KEYCLOAK_URL: str = _settings.keycloak_url
KEYCLOAK_REALM: str = _settings.keycloak_realm
KEYCLOAK_CLIENT_ID: str = _settings.keycloak_client_id
KEYCLOAK_PUBLIC_KEY: str = _settings.keycloak_public_key


# ---- JWT token payload models ----
class TokenPayload(BaseModel):
    sub: str  # subject (user ID)
    email: Optional[str] = None
    name: Optional[str] = None
    iat: int  # issued at
    exp: int  # expiration


def _decode_jwt_payload(token: str) -> dict:
    """Decode the middle section of a JWT (without verification for inspection)."""
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Invalid JWT format")
    payload_b64 = parts[1]
    # Add padding if needed
    payload_b64 += "=" * (4 - len(payload_b64) % 4) if len(payload_b64) % 4 else ""
    return json.loads(base64.urlsafe_b64decode(payload_b64).decode("utf-8"))


def _verify_jwt_signature(token: str, public_key_pem: str) -> dict:
    """Verify JWT signature using the provided public key."""
    try:
        payload = jwt.decode(
            token,
            public_key_pem,
            algorithms=["RS256"],
            audience=KEYCLOAK_CLIENT_ID,
            issuer=KEYCLOAK_URL + "/realms/" + KEYCLOAK_REALM,
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid JWT: {e}",
        )
    return payload


# ---- Dependency: get current user from JWT ----
async def get_current_user(
    authorization: str = Header(None),
) -> Optional[TokenPayload]:
    """
    Extract and validate the JWT from the Authorization header.

    Returns the decoded token payload if valid, or None if no auth header
    or in demo mode.
    """
    from app.core.config import Settings

    settings = get_settings()

    # Demo mode: accept any token without verification (local dev only)
    if settings.demo_mode:
        if authorization and authorization.startswith("Bearer "):
            token = authorization[len("Bearer "):]
            try:
                payload = jwt.decode(
                    token,
                    options={"verify_signature": False},
                    audience=settings.keycloak_client_id,
                    issuer=settings.keycloak_url + "/realms/" + settings.keycloak_realm,
                )
                return TokenPayload(**payload)
            except (jwt.InvalidTokenError, ValueError, Exception):
                return None
        return None

    # Production mode: require valid JWT
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization[len("Bearer "):]

    if not KEYCLOAK_PUBLIC_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Keycloak public key not configured",
        )

    try:
        payload = _verify_jwt_signature(token, KEYCLOAK_PUBLIC_KEY)
        return TokenPayload(**payload)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {e}",
        )


# ---- Protected endpoint ----
@router.get("/protected", summary="Protected endpoint requiring OIDC authentication")
async def protected_endpoint(
    current_user: Optional[TokenPayload] = Depends(get_current_user),
):
    """
    Protected endpoint that requires valid OIDC authentication.

    Returns the authenticated user's token payload claims.
    If not authenticated, returns a 401 Unauthorized response.
    """
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    return {
        "message": "Authentication successful",
        "user": {
            "sub": current_user.sub,
            "email": current_user.email,
            "name": current_user.name,
        },
    }


# ---- Well-known endpoints for Keycloak discovery ----
@router.get("/.well-known/openid-configuration", include_in_schema=False)
async def openid_configuration():
    """Keycloak OpenID configuration discovery endpoint."""
    return {
        "issuer": KEYCLOAK_URL + "/realms/" + KEYCLOAK_REALM,
        "authorization_endpoint": KEYCLOAK_URL + "/realms/" + KEYCLOAK_REALM + "/protocol/openid-connect/auth",
        "token_endpoint": KEYCLOAK_URL + "/realms/" + KEYCLOAK_REALM + "/protocol/openid-connect/token",
        "userinfo_endpoint": KEYCLOAK_URL + "/realms/" + KEYCLOAK_REALM + "/protocol/openid-connect/userinfo",
        "jwks_uri": KEYCLOAK_URL + "/realms/" + KEYCLOAK_REALM + "/protocol/openid-connect/certs",
        "registration_endpoint": KEYCLOAK_URL + "/realms/" + KEYCLOAK_REALM + "/protocol/openid-connect/auth",
    }
