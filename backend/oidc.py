\"\"\"OIDC JWT validation service for Keycloak.\"\"\"

import time
from typing import Optional, Dict, Any
from datetime import datetime, timezone

try:
    import jwt
except ImportError:
    jwt = None

from app.core.config import get_settings

Settings = get_settings()

class JWTValidationError(Exception):
    \"\"\"Raised when JWT validation fails.\"\"\"
    pass

def validate_jwt(token: str, public_key: Optional[str] = None) -> Dict[str, Any]:
    \"\"\"Validate a JWT token from Keycloak.

    Args:
        token: JWT token string
        public_key: Optional RSA public key; if not provided, uses config setting

    Returns:
        Decoded token payload

    Raises:
        JWTValidationError: If validation fails
    \"\"\"
    if jwt is None:
        raise JWTValidationError(\"PyJWT not installed. Install with: pip install PyJWT\")

    # Use provided key or config
    key = public_key or Settings.keycloak_public_key
    if not key:
        # In demo mode, accept any token for testing (demo mode only)
        if Settings.demo_mode:
            # In demo mode, we accept the token without verification for simplicity
            # Note: this is insecure for production; use proper verification in production
            return jwt.decode(token, options={\"verify_signature\": False})
        raise JWTValidationError(\"No public key configured for JWT validation\")

    # Verify signature and check claims
    try:
        payload = jwt.decode(
            token,
            key,
            algorithms=[\"RS256\"],
            audience=Settings.keycloak_client_id,
            issuer=Settings.keycloak_url + \"/realms/\" + Settings.keycloak_realm,
        )
    except jwt.InvalidTokenError as e:
        raise JWTValidationError(f\"Invalid JWT: {e}\")

    # Additional claim validation (optional)
    now = datetime.now(timezone.utc).timestamp()
    exp = payload.get(\"exp\")
    if exp and exp < now:
        raise JWTValidationError(\"Token expired\")

    iat = payload.get(\"iat\")
    if iat and iat > now + 300:
        raise JWTValidationError(\"Token issued in the future\")

    return payload

# Cached public key loading (placeholder for future enhancement)

_cached_public_key: Optional[str] = None

def get_public_key(realm: Optional[str] = None) -> str:
    \"\"\"Load public key from Keycloak (placeholder).

    In production, this would fetch the key from the Keycloak JWKS endpoint.
    \"\"\"
    global _cached_public_key
    if _cached_public_key is None:
        # TODO: implement fetching JWKS from {keycloak_url}/realms/{realm}/protocol/openid-connect/certs
        _cached_public_key = \"\"  # placeholder empty
    return _cached_public_key
