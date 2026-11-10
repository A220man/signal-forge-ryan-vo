# Changelog

## 1.7.0 — work-in-progress checkpoint

Partial code published for continued development. Known issues: STATUS.md.

## 1.6.0 — work-in-progress checkpoint

### Added
- Provider type selector in VoicePanel configuration modal, enabling custom OpenAI-compatible provider names (Ollama, OpenRouter, LiteLLM, etc.) with proper type selection (OpenAI Compatible, Google Gemini, Mock)
- Dynamic base URL and model defaults based on selected provider type

### Changed
- VoicePanel configuration modal now separates provider name from provider type
- Frontend ProviderConfigRequest type extended to include 'openai-compatible' provider type

Partial code published for continued development. Known issues: STATUS.md.

## 1.5.0 — work-in-progress checkpoint

### Added
- Enhanced mock voice provider with additional commands: help, delete_location, list_locations
- Mock provider now preserves case for extracted parameters (location names, custom names)
- Frontend handlers for new voice actions: delete_location, list_locations, help
- 9 new backend tests covering enhanced mock provider functionality

### Changed
- MockVoiceProvider.process_command uses improved pattern matching with proper command precedence
- Voice command extraction preserves original text casing for better UX

Partial code published for continued development. Known issues: STATUS.md.

Partial code published for continued development. Known issues: STATUS.md.

## 1.4.0 — work-in-progress checkpoint

### Added
- Web Speech API integration for real voice input in VoicePanel (microphone button now uses browser speech recognition instead of prompt() fallback)

### Changed
- VoicePanel.handleVoiceInput uses SpeechRecognition API with interim results display

Partial code published for continued development. Known issues: STATUS.md.
## 1.3.0 — work-in-progress checkpoint

Partial code published for continued development. Known issues: STATUS.md.

## 1.2.0 — work-in-progress checkpoint

Partial code published for continued development. Known issues: STATUS.md.

## 1.2.0 — 2024-10-21

### Added
- Voice interface with LLM provider abstraction (mock, OpenAI-compatible, Gemini)
- VoiceCommandRequest/Response schemas and VoiceProviderStatus schema
- VoiceService with provider factory pattern and availability checking
- GET /api/voice/providers and GET /api/voice/providers/{name} endpoints
- POST /api/voice/command endpoint for processing voice commands
- VoicePanel React component with provider selector, chat history, and text/voice input
- Voice actions: fly_to, search, save_location, show_cameras
- LLM provider configuration in settings (llm_provider, llm_api_key, llm_model, llm_base_url, llm_timeout)
- Backend voice tests (21 tests covering providers, service, and API endpoints)
- Frontend VoicePanel tests (6 tests)

### Changed
- App component integrated VoicePanel with voice action handlers
- Frontend types extended with VoiceProvider, VoiceCommandRequest, VoiceCommandResponse, VoiceProviderStatus
- API client extended with voiceService (sendCommand, getProviders, getProvider)

### Security
- Voice providers validate API keys before making requests
- Graceful error handling when providers unavailable or misconfigured
- No API keys exposed to frontend

## 1.1.0 — 2024-10-14
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