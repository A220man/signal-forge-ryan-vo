# Changelog

## 1.10.0 — work-in-progress checkpoint

Partial code published for continued development. Known issues: STATUS.md.

## 1.9.1 — OIDC authentication

### Added
- Keycloak OIDC authentication integration
- Backend JWT token validation with Keycloak configuration from Settings
- Protected API endpoint `/api/oidc/protected` requiring authentication
- OpenID Connect discovery endpoint at `/api/oidc/.well-known/openid-configuration`
- Frontend-ready Keycloak realm configuration (realm: signal-forge-realm, client: signal-forge)
- Demo mode for local development without valid JWT

### Changed
- Moved Keycloak configuration (`keycloak_url`, `keycloak_realm`, `keycloak_client_id`, `keycloak_public_key`, `keycloak_enable`) from module-level constants into `app.core.config.Settings` for proper configuration via `.env` and testability

### Fixed
- OIDC protected endpoint now properly returns 401 when not authenticated
- OIDC demo mode correctly accepts any JWT token without signature verification for local development

## 1.9.0 — work-in-progress checkpoint

Partial code published for continued development. Known issues: STATUS.md.

## 1.8.0 — work-in-progress checkpoint

Partial code published for continued development. Known issues: STATUS.md.

## 1.7.0 — work-in-progress checkpoint

Partial code published for continued development. Known issues: STATUS.md.

## 1.6.0 — work-in-progress checkpoint

### Added
- Provider type selector in VoicePanel configuration modal, enabling custom OpenAI-compatible provider names (Ollama, OpenRouter, LiteLLM, etc.) with proper type selection (OpenAI Compatible, Google Gemini, Mock)
- Dynamic base URL and model defaults based on selected provider type
