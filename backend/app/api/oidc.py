"""OIDC authentication router with Keycloak JWT validation."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2AuthorizationCodeBearer
from pydantic import BaseModel, Field
from typing import Optional
import json
import base64
import os

router = APIRouter(prefix="/api/oidc", tags=["oidc"])

# ---- Keycloak configuration from settings ----
# These would normally come from app.core.config.Settings
KEYCLOAK_URL: str = os.getenv("KEYCLOAK_URL", "https://keycloak.example.com")
KEYCLOAK_REALM: str = os.getenv("KEYCLOAK_REALM", "signal-forge-realm")
KEYCLOAK_CLIENT_ID: str = os.getenv("KEYCLOAK_CLIENT_ID", "signal-forge")
KEYCLOAK_PUBLIC_KEY: str = os.getenv("KEYCLOAK_PUBLIC_KEY", "")


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
    # Decode payload (base64url)
    payload_b64 = parts[1]
    # Add padding if needed
    payload_b64 += "=" * (4 - len(payload_b64) % 4) if len(payload_b64) % 4 else ""
    return json.loads(base64.urlsafe_b64decode(payload_b64).decode("utf-8"))


def _verify_jwt_signature(token: str, public_key_pem: str) -> dict:
    """Verify JWT signature using the provided public key."""
    from jose import jwt as jose_jwt

    return jose_jwt.decode(
        token,
        public_key_pem,
        algorithms=["RS256"],
        audience=KEYCLOAK_CLIENT_ID,
        issuer=f"{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}",
    )


# ---- Dependency: get current user from JWT ----
async def get_current_user(
    authorization: Optional[str] = None,
) -> Optional[TokenPayload]:
    """
    Dependency that extracts and validates a Bearer JWT token.

    In demo mode (no KEYCLOAK_PUBLIC_KEY configured), returns None
    so protected endpoints work in local development.

    In production mode, validates the token against the Keycloak public key.
    """
    if authorization is None or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.split(" ", 1)[1]

    if not KEYCLOAK_PUBLIC_KEY:
        # Demo mode: no Keycloak configured; allow access in development
        # Return a minimal payload so the endpoint can function
        try:
            payload = _decode_jwt_payload(token)
            return TokenPayload(
                sub=payload.get("sub", "demo-user"),
                email=payload.get("email"),
                name=payload.get("name"),
                iat=payload.get("iat", 0),
                exp=payload.get("exp", 0),
            )
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid JWT token",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # Production mode: verify signature
    try:
        payload = _verify_jwt_signature(token, KEYCLOAK_PUBLIC_KEY)
        return TokenPayload(**payload)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"JWT validation failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ---- Protected endpoint ----
@router.get("/protected", summary="Protected endpoint requiring OIDC authentication")
async def protected_endpoint(
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Protected endpoint that requires valid OIDC/JWT authentication.

    - In demo mode (no Keycloak public key): returns demo user info
    - In production mode: validates the JWT and returns user claims
    """
    return {
        "message": "Access granted",
        "user": {
            "sub": current_user.sub,
            "email": current_user.email,
            "name": current_user.name,
        },
        "auth_mode": "production" if KEYCLOAK_PUBLIC_KEY else "demo",
    }


# ---- Well-known endpoints for Keycloak discovery ----
@router.get("/.well-known/openid-configuration", include_in_schema=False)
async def openid_configuration():
    """Keycloak OpenID configuration discovery endpoint."""
    return {
        "issuer": f"{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}",
        "authorization_endpoint": f"{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/authorize",
        "token_endpoint": f"{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/token",
        "userinfo_endpoint": f"{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/userinfo",
        "jwks_uri": f"{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/certs",
        "registration_endpoint": f"{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/register",
    }
