"""Tests for voice service and API."""

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import create_app
from app.services.voice import (
    get_voice_service,
    close_voice_service,
    MockVoiceProvider,
    OpenAICompatibleProvider,
    GeminiProvider,
)
from app.api.voice import ProviderConfigRequest, ProviderConfigResponse
from app.models.schemas import VoiceCommandRequest, VoiceProvider


@pytest.fixture
def app():
    return create_app()


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture(autouse=True)
async def reset_voice_service():
    """Reset the voice service singleton between tests."""
    await close_voice_service()


class TestVoiceProviders:
    """Test individual voice providers."""

    @pytest.mark.asyncio
    async def test_mock_provider_process_command(self):
        provider = MockVoiceProvider()
        request = VoiceCommandRequest(text="fly to London")
        response = await provider.process_command(request)

        assert response.success is True
        assert response.provider == "mock"
        assert response.action == "fly_to"
        assert "location" in response.action_params

    @pytest.mark.asyncio
    async def test_mock_provider_search_command(self):
        provider = MockVoiceProvider()
        request = VoiceCommandRequest(text="search for Paris")
        response = await provider.process_command(request)

        assert response.success is True
        assert response.action == "search"
        assert "query" in response.action_params

    @pytest.mark.asyncio
    async def test_mock_provider_save_location(self):
        provider = MockVoiceProvider()
        request = VoiceCommandRequest(text="save this location")
        response = await provider.process_command(request)

        assert response.success is True
        assert response.action == "save_location"

    @pytest.mark.asyncio
    async def test_mock_provider_show_cameras(self):
        provider = MockVoiceProvider()
        request = VoiceCommandRequest(text="show cameras")
        response = await provider.process_command(request)

        assert response.success is True
        assert response.action == "show_cameras"

    @pytest.mark.asyncio
    async def test_mock_provider_unknown_command(self):
        provider = MockVoiceProvider()
        request = VoiceCommandRequest(text="what is the weather like")
        response = await provider.process_command(request)

        assert response.success is True
        assert response.action is None

    @pytest.mark.asyncio
    async def test_mock_provider_availability(self):
        provider = MockVoiceProvider()
        status = await provider.check_availability()

        assert status.provider == "mock"
        assert status.available is True
        assert status.model == "mock"

    @pytest.mark.asyncio
    async def test_openai_provider_no_key(self):
        provider = OpenAICompatibleProvider(api_key="", base_url="https://api.openai.com/v1", model="gpt-4o-mini")
        request = VoiceCommandRequest(text="fly to Tokyo")
        response = await provider.process_command(request)

        assert response.success is False
        assert response.error == "Missing API key"

    @pytest.mark.asyncio
    async def test_openai_provider_availability_no_key(self):
        provider = OpenAICompatibleProvider(api_key="", base_url="https://api.openai.com/v1", model="gpt-4o-mini")
        status = await provider.check_availability()

        assert status.provider == "openai"
        assert status.available is False
        assert status.error == "API key not configured"

    @pytest.mark.asyncio
    async def test_gemini_provider_no_key(self):
        provider = GeminiProvider(api_key="", model="gemini-1.5-flash")
        request = VoiceCommandRequest(text="fly to Tokyo")
        response = await provider.process_command(request)

        assert response.success is False
        assert response.error == "Missing API key"

    @pytest.mark.asyncio
    async def test_gemini_provider_availability_no_key(self):
        provider = GeminiProvider(api_key="", model="gemini-1.5-flash")
        status = await provider.check_availability()

        assert status.provider == "gemini"
        assert status.available is False
        assert status.error == "API key not configured"


class TestVoiceService:
    """Test the voice service."""

    @pytest.mark.asyncio
    async def test_service_initialization(self):
        service = get_voice_service()
        providers = service.get_available_providers()

        assert "mock" in providers
        assert service.get_provider() is not None

    @pytest.mark.asyncio
    async def test_service_get_provider_by_name(self):
        service = get_voice_service()

        mock_provider = service.get_provider("mock")
        assert mock_provider is not None
        assert mock_provider.get_provider_name() == "mock"

        # Unknown provider falls back to default
        unknown = service.get_provider("nonexistent")
        assert unknown is not None

    @pytest.mark.asyncio
    async def test_service_process_command(self):
        service = get_voice_service()
        request = VoiceCommandRequest(text="fly to New York")
        response = await service.process_command(request)

        assert response.success is True
        assert response.provider == "mock"
        assert response.action == "fly_to"

    @pytest.mark.asyncio
    async def test_service_check_all_providers(self):
        service = get_voice_service()
        statuses = await service.check_all_providers()

        assert len(statuses) >= 1
        mock_status = next(s for s in statuses if s.provider == "mock")
        assert mock_status.available is True


class TestVoiceAPI:
    """Test voice API endpoints."""

    @pytest.mark.asyncio
    async def test_voice_command_endpoint(self, client: AsyncClient):
        response = await client.post(
            "/api/voice/command",
            json={"text": "fly to London", "provider": "mock"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["provider"] == "mock"
        assert data["action"] == "fly_to"
        assert "location" in data["action_params"]

    @pytest.mark.asyncio
    async def test_voice_command_default_provider(self, client: AsyncClient):
        response = await client.post(
            "/api/voice/command",
            json={"text": "search for Paris"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["action"] == "search"

    @pytest.mark.asyncio
    async def test_voice_command_invalid_provider(self, client: AsyncClient):
        response = await client.post(
            "/api/voice/command",
            json={"text": "fly to London", "provider": "nonexistent"},
        )

        # Should fall back to default provider (mock)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    @pytest.mark.asyncio
    async def test_voice_command_empty_text(self, client: AsyncClient):
        response = await client.post(
            "/api/voice/command",
            json={"text": ""},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    @pytest.mark.asyncio
    async def test_list_providers_endpoint(self, client: AsyncClient):
        response = await client.get("/api/voice/providers")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        mock_provider = next((p for p in data if p["provider"] == "mock"), None)
        assert mock_provider is not None
        assert mock_provider["available"] is True

    @pytest.mark.asyncio
    async def test_get_provider_status_endpoint(self, client: AsyncClient):
        response = await client.get("/api/voice/providers/mock")

        assert response.status_code == 200
        data = response.json()
        assert data["provider"] == "mock"
        assert data["available"] is True

    @pytest.mark.asyncio
    async def test_get_provider_status_not_found(self, client: AsyncClient):
        response = await client.get("/api/voice/providers/nonexistent")

        assert response.status_code == 404
class TestProviderConfigAPI:
    """Test provider configuration API endpoints."""

    @pytest.mark.asyncio
    async def test_configure_provider_openai(self, client: AsyncClient):
        response = await client.post(
            "/api/voice/providers/configure",
            json={
                "name": "openai",
                "provider_type": "openai",
                "api_key": "test-key-123",
                "base_url": "https://api.openai.com/v1",
                "model": "gpt-4o-mini",
                "set_as_default": True,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["provider_name"] == "openai"

        # Verify the provider was added
        list_response = await client.get("/api/voice/providers")
        providers = list_response.json()
        openai_provider = next((p for p in providers if p["provider"] == "openai"), None)
        assert openai_provider is not None
        # Note: availability will be False since we're using a fake key, but provider should exist

    @pytest.mark.asyncio
    async def test_configure_provider_gemini(self, client: AsyncClient):
        response = await client.post(
            "/api/voice/providers/configure",
            json={
                "name": "gemini",
                "provider_type": "gemini",
                "api_key": "test-gemini-key",
                "model": "gemini-1.5-flash",
                "set_as_default": False,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["provider_name"] == "gemini"

        # Verify the provider was added but not set as default
        list_response = await client.get("/api/voice/providers")
        providers = list_response.json()
        gemini_provider = next((p for p in providers if p["provider"] == "gemini"), None)
        assert gemini_provider is not None

        # Default should still be mock
        default_response = await client.post(
            "/api/voice/command",
            json={"text": "fly to London"},
        )
        assert default_response.json()["provider"] == "mock"

    @pytest.mark.asyncio
    async def test_configure_provider_invalid_type(self, client: AsyncClient):
        response = await client.post(
            "/api/voice/providers/configure",
            json={
                "name": "invalid",
                "provider_type": "invalid",
                "api_key": "test-key",
            },
        )

        assert response.status_code == 400
        data = response.json()
        assert "Unsupported provider type" in data["detail"]

    @pytest.mark.asyncio
    async def test_set_default_provider(self, client: AsyncClient):
        # First configure a provider
        await client.post(
            "/api/voice/providers/configure",
            json={
                "name": "openai",
                "provider_type": "openai",
                "api_key": "test-key-123",
                "set_as_default": False,
            },
        )

        # Now set it as default
        response = await client.post("/api/voice/providers/openai/default")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["provider_name"] == "openai"

        # Verify it's now the default
        default_response = await client.post(
            "/api/voice/command",
            json={"text": "fly to London"},
        )
        assert default_response.json()["provider"] == "openai"

    @pytest.mark.asyncio
    async def test_set_default_provider_not_found(self, client: AsyncClient):
        response = await client.post("/api/voice/providers/nonexistent/default")

        assert response.status_code == 404
        data = response.json()
        assert "not found" in data["detail"].lower()