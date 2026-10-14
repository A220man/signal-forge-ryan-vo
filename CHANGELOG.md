# Changelog

## 1.1.0 — work-in-progress checkpoint

Partial code published for continued development. Known issues: STATUS.md.

## 1.0.0 — work-in-progress checkpoint

Partial code published for continued development. Known issues: STATUS.md.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-10-12

### Added
- FastAPI backend with health check and geocoding endpoints
- Nominatim geocoding client with in-memory caching and rate limiting
- React + TypeScript + Vite frontend with globe.gl 3D globe
- Location search panel with debounced Nominatim queries
- Saved locations sidebar with localStorage persistence
- Camera HUD with real-time position, altitude, heading, pitch
- Collapsible sidebar, dark/light theme, keyboard navigation
- Multi-stage Dockerfiles for backend and frontend
- Docker Compose for local development
- Backend tests (health, geocoding with caching, error handling)
- Frontend tests (SearchPanel, Sidebar)
- GitHub Actions CI workflow
- MIT License
- README with architecture diagram and setup instructions

### Security
- Non-root Docker users
- CORS restricted to configured origins
- Rate limiting on geocoding endpoint
- Demo mode flag for local-only development

## [1.1.0] - 2024-10-14

### Added
- Live traffic camera feeds on 3D globe
- CameraFeed and CameraFeedResponse schemas with status tracking (active/inactive/unknown)
- CameraService with in-memory caching, bounding box filtering, and health checking
- GET /api/cameras endpoint with optional bbox filtering and caching
- GET /api/cameras/{id}/proxy endpoint for CORS-free image streaming
- CameraPanel UI component with filter tabs, live preview, and fly-to-camera action
- Globe camera markers with status colors (green=active, red=inactive, yellow=unknown)
- Automatic camera refresh on globe navigation with debouncing
- Backend camera tests (7 tests: list, structure, bbox filter, invalid bbox, missing params, proxy 404, caching)
- Frontend types extended with CameraFeed, CameraFeedResponse, CameraStatus

### Changed
- Globe component extended with camera marker management and selection highlighting
- App component integrated camera fetching, selection, and fly-to workflows
- API client added getCameras() and getCameraImageUrl() methods

### Security
- Camera image proxy adds CORS headers and cache control
- Health checks use HEAD requests to minimize bandwidth