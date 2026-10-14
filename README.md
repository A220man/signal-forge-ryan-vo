# Signal Forge

> Work in progress. This checkpoint may be incomplete or fail tests. See PLAN.md and STATUS.md before use.


**Ryan Vo | AI & Machine Learning**

A spy satellite simulator in your browser, except the data is real. Live open source spatial intelligence on a photorealistic 3D globe.

## Problem

Open source intelligence (OSINT) analysts, researchers, and enthusiasts need a unified, real-time view of global spatial data — traffic cameras, radio receivers, aircraft, satellites, weather — but existing tools are fragmented, require heavy local hardware, or lack a cohesive 3D interface.

## Solution

Signal Forge provides a browser-based 3D globe that aggregates live open data sources:

- **Live traffic cameras** — Real-time frames projected onto the globe at their true coordinates
- **Global location search** — Nominatim geocoding with debounced search and camera fly-to animation
- **Saved locations** — Persist custom camera positions with names in localStorage
- **Real-time HUD** — Live latitude, longitude, altitude, heading, and pitch display

All rendering happens in the browser via WebGL (three.js + globe.gl). No specialized hardware required beyond a modern GPU.

## AI/ML Evaluation

This application is a spatial intelligence platform. The AI/ML evaluation framework will be added in future iterations:

- **Planned**: LLM provider abstraction (OpenAI-compatible, Anthropic, Gemini, Ollama) for natural language globe commands
- **Planned**: Voice interaction via WebSocket streaming APIs
- **Planned**: Automated workflow compilation from repeated user action sequences

Current baseline: deterministic globe navigation and data visualization without LLM dependency.

## Architecture

```mermaid
graph TB
    subgraph Frontend
        UI[React + TypeScript + Vite]
        Globe[globe.gl + three.js]
        Search[Search Panel]
        Sidebar[Saved Locations]
        CameraPanel[Camera Feeds Panel]
        HUD[Heads-Up Display]
    end

    subgraph Backend
        API[FastAPI]
        Health[/health]
        Geocode[/api/geocode]
        Cameras[/api/cameras]
        CameraProxy[/api/cameras/{id}/proxy]
        Nominatim[Nominatim Client]
        CameraService[Camera Service]
    end

    UI --> Globe
    UI --> Search
    UI --> Sidebar
    UI --> CameraPanel
    UI --> HUD
    Search --> Geocode
    Geocode --> Nominatim
    Nominatim --> OSM[(OpenStreetMap Nominatim)]
    CameraPanel --> Cameras
    Cameras --> CameraService
    CameraProxy --> CameraService
    CameraService --> MockData[(Mock Camera Data)]
    API --> Health
    API --> Geocode
    API --> Cameras
    API --> CameraProxy
```

## Features

- **Photorealistic 3D Globe** — Night/earth textures, atmosphere, graticules
- **Location Search** — Debounced Nominatim geocoding, keyboard navigation, click-to-fly
- **Saved Locations** — Name, persist, rename, delete, recall camera positions
- **Live Traffic Cameras** — Camera markers on globe with status colors, click for live preview and fly-to
- **Camera HUD** — Real-time position, altitude, heading, pitch
- **Responsive UI** — Collapsible sidebar, dark/light theme, accessibility support
- **Docker Ready** — Multi-stage builds, non-root users, health checks

## Quick Start

### Prerequisites

- Docker 24+ and Docker Compose v2
- Or: Python 3.12, Node 24, npm

### With Docker Compose

```bash
docker compose up --build
```

Frontend: http://localhost:5173  
Backend API: http://localhost:8000  
API Docs: http://localhost:8000/docs

### Local Development

**Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## API Reference

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "environment": "development",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### GET /api/geocode?q={query}
Search for locations via Nominatim.

**Parameters:**
- `q` (required): Location query string (1-200 chars)

**Response:**
```json
{
  "results": [
    {
      "place_id": 123456,
      "licence": "Data © OpenStreetMap contributors",
      "osm_type": "relation",
      "osm_id": 12345,
      "lat": "51.5074",
      "lon": "-0.1278",
      "display_name": "London, Greater London, England, United Kingdom",
      "class": "place",
      "type": "city",
      "importance": 0.9,
      "address": { "city": "London", "country": "United Kingdom" },
      "boundingbox": ["51.2868", "51.6919", "-0.5104", "0.3350"]
    }
  ],
  "query": "London",
  "timestamp": "2024-01-01T00:00:00Z",
  "cached": false
}
```

### GET /api/cameras
Get traffic camera feeds, optionally filtered by bounding box.

**Parameters:**
- `min_lat`, `min_lng`, `max_lat`, `max_lng` (optional): Bounding box filter (all four required)

**Response:**
```json
{
  "cameras": [
    {
      "id": "austin-congress-1",
      "name": "Congress Ave Bridge",
      "lat": 30.2608,
      "lng": -97.7431,
      "image_url": "https://example.com/camera.jpg",
      "status": "active",
      "last_checked": "2024-01-01T00:00:00Z",
      "source": "demo",
      "attribution": "Demo camera - Unsplash"
    }
  ],
  "timestamp": "2024-01-01T00:00:00Z",
  "cached": false
}
```

### GET /api/cameras/{camera_id}/proxy
Proxy a camera image to avoid CORS issues. Returns the image with CORS headers.

## Configuration

Copy `.env.example` to `.env` and adjust:

```env
# Backend
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
NOMINATIM_BASE_URL=https://nominatim.openstreetmap.org
NOMINATIM_RATE_LIMIT=1.0
GEOCODE_CACHE_TTL=3600
DEMO_MODE=true
```

## Testing

**Backend:**
```bash
cd backend
source .venv/bin/activate
PYTHONPATH=. python -m pytest tests/ -v
```

**Frontend:**
```bash
cd frontend
npm test
```

## Security Limitations

- **No authentication in demo mode** — Demo mode binds to localhost only; production requires OIDC/Keycloak
- **Nominatim rate limits** — 1 request/second enforced client and server side
- **No HTTPS in development** — Use reverse proxy (Traefik, nginx) with TLS in production
- **localStorage only** — Saved locations stored locally, not synced or encrypted
- **No input sanitization on globe** — Coordinate values passed directly to WebGL
- **Demo camera data** — Camera feeds use placeholder images; production requires real camera API integration

## Provider Configuration

| Provider | Purpose | Required | Config |
|----------|---------|----------|--------|
| Nominatim | Geocoding | Yes | `NOMINATIM_BASE_URL`, `NOMINATIM_RATE_LIMIT` |
| OpenAI-compatible | LLM (planned) | No | `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` |
| Anthropic | LLM (planned) | No | `LLM_API_KEY`, `LLM_MODEL` |
| Gemini | LLM (planned) | No | `LLM_API_KEY`, `LLM_MODEL` |
| Ollama | Local LLM (planned) | No | `LLM_BASE_URL`, `LLM_MODEL` |

## SSO/SAML Setup (Planned)

Keycloak realm configuration will be provided in `keycloak/realm-export.json`. Configure identity brokering for upstream SAML IdPs.

## Backup/Restore

Saved locations are in browser localStorage. For backend data (when database added):

```bash
# Backup
docker compose exec backend sqlite3 data/app.db .dump > backup.sql

# Restore
docker compose exec -T backend sqlite3 data/app.db < backup.sql
```

## TLS Reverse Proxy

Production deployment requires a reverse proxy terminating TLS:

```nginx
server {
    listen 443 ssl http2;
    server_name signal-forge.example.com;

    ssl_certificate /etc/letsencrypt/live/signal-forge.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/signal-forge.example.com/privkey.pem;

    location / {
        proxy_pass http://frontend:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /health {
        proxy_pass http://backend:8000;
    }
}
```

## License

MIT License — Copyright (c) 2024 Ryan Vo <ryandtvo@gmail.com>

See [LICENSE](LICENSE) for full text.