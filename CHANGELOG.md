# Changelog

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