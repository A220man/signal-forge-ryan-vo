# Product development plan

Each round completes one feature or repair. Future items are planned, not implemented claims.

## Current round

camera-feeds

## Roadmap

### core-skeleton — FastAPI/React skeleton with 3D globe and location search

Status: done

Acceptance:
- FastAPI backend runs with health endpoint
- React + TypeScript + Vite frontend builds and runs
- 3D globe renders using three.js/globe.gl
- Location search via Nominatim geocoding works
- Clicking search result flies camera to location on globe
- Backend and frontend tests pass
- Dockerfiles and compose.yaml present

Implementation: `backend/app/main.py`, `backend/app/api/health.py`, `backend/app/api/geocode.py`, `backend/app/services/geocoding.py`, `backend/app/models/schemas.py`, `backend/app/core/config.py`, `backend/tests/test_health.py`, `backend/tests/test_geocode.py`, `frontend/src/App.tsx`, `frontend/src/components/Globe.tsx`, `frontend/src/components/SearchPanel.tsx`, `frontend/src/components/Sidebar.tsx`, `frontend/src/components/HUD.tsx`, `frontend/src/components/Toast.tsx`, `frontend/src/hooks/useGeocode.ts`, `frontend/src/hooks/useGlobe.ts`, `frontend/src/services/api.ts`, `frontend/src/types/index.ts`, `frontend/src/styles/globals.css`, `frontend/src/styles/variables.css`

Tests: `backend/tests/test_health.py`, `backend/tests/test_geocode.py`, `frontend/src/components/SearchPanel.test.tsx`, `frontend/src/components/Sidebar.test.tsx`

### saved-locations — Saved/favourite locations with localStorage persistence

Status: done

Acceptance:
- User can save current globe camera position with custom name
- Saved locations appear in a sidebar/list
- Clicking saved location restores camera position
- Locations persist in localStorage across sessions
- User can rename/delete saved locations

Implementation: `frontend/src/components/Sidebar.tsx`, `frontend/src/App.tsx`

Tests: `frontend/src/components/Sidebar.test.tsx`

### camera-feeds — Live traffic camera feeds on globe

Status: done

Acceptance:
- Backend proxies camera feeds with CORS headers
- Camera markers appear on globe at correct coordinates
- Clicking marker shows live camera frame
- Feed health polling filters dead cameras

Implementation: `backend/app/models/schemas.py`, `backend/app/services/cameras.py`, `backend/app/api/cameras.py`, `backend/app/main.py`, `backend/app/api/__init__.py`, `backend/tests/test_cameras.py`, `frontend/src/types/index.ts`, `frontend/src/services/api.ts`, `frontend/src/components/Globe.tsx`, `frontend/src/components/CameraPanel.tsx`, `frontend/src/components/CameraPanel.module.css`, `frontend/src/App.tsx`

Tests: `backend/tests/test_cameras.py`

### voice-interface — Voice interaction with LLM provider abstraction

Status: planned

Acceptance:
- Provider interface supports OpenAI-compatible and Gemini
- Voice commands can trigger globe actions (fly to, search)
- Runtime provider picker in UI
- Graceful errors when provider unavailable

### auth-oidc — OIDC authentication with Keycloak

Status: planned

Acceptance:
- Keycloak realm configuration included
- Backend validates JWT tokens
- Frontend PKCE flow with sessionStorage
- Protected API endpoints require authentication
- Demo mode for local development only

### radio-layers — Radio/RF map layers and web receiver tuning

Status: planned

Acceptance:
- Broadcast stations layer on globe
- Web receiver (KiwiSDR/WebSDR) markers
- Clicking receiver tunes audio in browser
- Local SDR support (browser USB/WebAudio)

