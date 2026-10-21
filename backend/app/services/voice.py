"""Voice service with provider abstraction for LLM interactions."""

import asyncio
import json
import time
from abc import ABC, abstractmethod
from typing import Optional

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.core.config import get_settings
from app.models.schemas import (
    VoiceCommandRequest,
    VoiceCommandResponse,
    VoiceProvider,
    VoiceProviderStatus,
)


class VoiceProviderBase(ABC):
    """Abstract base class for voice/LLM providers."""

    @abstractmethod
    async def process_command(self, request: VoiceCommandRequest) -> VoiceCommandResponse:
        """Process a voice command and return structured response."""
        pass

    @abstractmethod
    async def check_availability(self) -> VoiceProviderStatus:
        """Check if the provider is available."""
        pass

    @abstractmethod
    def get_provider_name(self) -> str:
        """Get the provider name."""
        pass


class MockVoiceProvider(VoiceProviderBase):
    """Mock voice provider for testing and development."""

    def __init__(self):
        self.name = "mock"

    async def process_command(self, request: VoiceCommandRequest) -> VoiceCommandResponse:
        """Process command with simple pattern matching for demo purposes."""
        text = request.text.lower()

        # Simple command parsing for demo
        action = None
        action_params = {}

        if "fly to" in text or "go to" in text or "navigate to" in text:
            action = "fly_to"
            # Extract location name (simple heuristic)
            for prefix in ["fly to ", "go to ", "navigate to "]:
                if prefix in text:
                    location = text.split(prefix, 1)[1].strip().rstrip(".,!?")
                    action_params = {"location": location}
                    break
        elif "search for" in text or "find " in text:
            action = "search"
            for prefix in ["search for ", "find "]:
                if prefix in text:
                    query = text.split(prefix, 1)[1].strip().rstrip(".,!?")
                    action_params = {"query": query}
                    break
        elif "save" in text and ("location" in text or "place" in text):
            action = "save_location"
            action_params = {"name": "Voice saved location"}
        elif "camera" in text or "traffic cam" in text:
            action = "show_cameras"
            action_params = {}

        response_text = f"Mock provider processed: '{request.text}'"
        if action:
            response_text += f" → Action: {action} with params {action_params}"

        return VoiceCommandResponse(
            success=True,
            text=response_text,
            action=action,
            action_params=action_params,
            provider=self.name,
        )

    async def check_availability(self) -> VoiceProviderStatus:
        return VoiceProviderStatus(
            provider=self.name,
            available=True,
            model="mock",
        )

    def get_provider_name(self) -> str:
        return self.name


class OpenAICompatibleProvider(VoiceProviderBase):
    """OpenAI-compatible provider (OpenAI, LiteLLM, OpenRouter, Ollama, etc.)."""

    def __init__(self, api_key: str, base_url: str, model: str, timeout: float = 30.0):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout
        self.name = "openai"

    def _get_headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def _build_system_prompt(self) -> str:
        return """You are a voice assistant for Signal Forge, a 3D globe application with live camera feeds.
You can help users navigate the globe, search for locations, and view camera feeds.

Respond with a JSON object containing:
{
  "response": "Natural language response to the user",
  "action": "fly_to|search|save_location|show_cameras|null",
  "action_params": {"location": "..."} or {"query": "..."} or {}
}

Available actions:
- fly_to: Navigate to a location (params: location: string)
- search: Search for a location (params: query: string)
- save_location: Save current camera position (params: name: string)
- show_cameras: Show nearby traffic cameras (params: {})

Only include action if the user's request matches one of these actions.
If no action matches, set action to null and action_params to {}.
"""

    async def process_command(self, request: VoiceCommandRequest) -> VoiceCommandResponse:
        if not self.api_key:
            return VoiceCommandResponse(
                success=False,
                text="OpenAI-compatible provider not configured (missing API key)",
                provider=self.name,
                error="Missing API key",
            )

        system_prompt = self._build_system_prompt()

        payload = {
            "model": request.model or self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.text},
            ],
            "temperature": 0.3,
            "max_tokens": 500,
            "response_format": {"type": "json_object"},
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=self._get_headers(),
                    json=payload,
                )

                if response.status_code != 200:
                    error_detail = response.text
                    return VoiceCommandResponse(
                        success=False,
                        text=f"Provider error: {response.status_code}",
                        provider=self.name,
                        error=f"HTTP {response.status_code}: {error_detail}",
                    )

                data = response.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "{}")

                try:
                    parsed = json.loads(content)
                    return VoiceCommandResponse(
                        success=True,
                        text=parsed.get("response", "Command processed"),
                        action=parsed.get("action"),
                        action_params=parsed.get("action_params", {}),
                        provider=self.name,
                    )
                except json.JSONDecodeError:
                    return VoiceCommandResponse(
                        success=True,
                        text=content,
                        provider=self.name,
                    )

        except httpx.TimeoutException:
            return VoiceCommandResponse(
                success=False,
                text="Request timed out",
                provider=self.name,
                error="Timeout",
            )
        except httpx.RequestError as e:
            return VoiceCommandResponse(
                success=False,
                text=f"Request failed: {str(e)}",
                provider=self.name,
                error=str(e),
            )
        except Exception as e:
            return VoiceCommandResponse(
                success=False,
                text=f"Unexpected error: {str(e)}",
                provider=self.name,
                error=str(e),
            )

    async def check_availability(self) -> VoiceProviderStatus:
        if not self.api_key:
            return VoiceProviderStatus(
                provider=self.name,
                available=False,
                model=self.model,
                error="API key not configured",
            )

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.base_url}/models",
                    headers=self._get_headers(),
                )
                return VoiceProviderStatus(
                    provider=self.name,
                    available=response.status_code == 200,
                    model=self.model,
                    error=None if response.status_code == 200 else f"HTTP {response.status_code}",
                )
        except Exception as e:
            return VoiceProviderStatus(
                provider=self.name,
                available=False,
                model=self.model,
                error=str(e),
            )

    def get_provider_name(self) -> str:
        return self.name


class GeminiProvider(VoiceProviderBase):
    """Google Gemini provider."""

    def __init__(self, api_key: str, model: str = "gemini-1.5-flash", timeout: float = 30.0):
        self.api_key = api_key
        self.model = model
        self.timeout = timeout
        self.name = "gemini"
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"

    def _build_system_prompt(self) -> str:
        return """You are a voice assistant for Signal Forge, a 3D globe application with live camera feeds.
You can help users navigate the globe, search for locations, and view camera feeds.

Respond with a JSON object containing:
{
  "response": "Natural language response to the user",
  "action": "fly_to|search|save_location|show_cameras|null",
  "action_params": {"location": "..."} or {"query": "..."} or {}
}

Available actions:
- fly_to: Navigate to a location (params: location: string)
- search: Search for a location (params: query: string)
- save_location: Save current camera position (params: name: string)
- show_cameras: Show nearby traffic cameras (params: {})

Only include action if the user's request matches one of these actions.
If no action matches, set action to null and action_params to {}.
"""

    async def process_command(self, request: VoiceCommandRequest) -> VoiceCommandResponse:
        if not self.api_key:
            return VoiceCommandResponse(
                success=False,
                text="Gemini provider not configured (missing API key)",
                provider=self.name,
                error="Missing API key",
            )

        system_prompt = self._build_system_prompt()

        payload = {
            "contents": [
                {"role": "user", "parts": [{"text": f"{system_prompt}\n\nUser: {request.text}"}]}
            ],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 500,
                "responseMimeType": "application/json",
            },
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/models/{self.model}:generateContent?key={self.api_key}",
                    json=payload,
                )

                if response.status_code != 200:
                    error_detail = response.text
                    return VoiceCommandResponse(
                        success=False,
                        text=f"Provider error: {response.status_code}",
                        provider=self.name,
                        error=f"HTTP {response.status_code}: {error_detail}",
                    )

                data = response.json()
                content = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "{}")

                try:
                    parsed = json.loads(content)
                    return VoiceCommandResponse(
                        success=True,
                        text=parsed.get("response", "Command processed"),
                        action=parsed.get("action"),
                        action_params=parsed.get("action_params", {}),
                        provider=self.name,
                    )
                except json.JSONDecodeError:
                    return VoiceCommandResponse(
                        success=True,
                        text=content,
                        provider=self.name,
                    )

        except httpx.TimeoutException:
            return VoiceCommandResponse(
                success=False,
                text="Request timed out",
                provider=self.name,
                error="Timeout",
            )
        except httpx.RequestError as e:
            return VoiceCommandResponse(
                success=False,
                text=f"Request failed: {str(e)}",
                provider=self.name,
                error=str(e),
            )
        except Exception as e:
            return VoiceCommandResponse(
                success=False,
                text=f"Unexpected error: {str(e)}",
                provider=self.name,
                error=str(e),
            )

    async def check_availability(self) -> VoiceProviderStatus:
        if not self.api_key:
            return VoiceProviderStatus(
                provider=self.name,
                available=False,
                model=self.model,
                error="API key not configured",
            )

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.base_url}/models?key={self.api_key}",
                )
                return VoiceProviderStatus(
                    provider=self.name,
                    available=response.status_code == 200,
                    model=self.model,
                    error=None if response.status_code == 200 else f"HTTP {response.status_code}",
                )
        except Exception as e:
            return VoiceProviderStatus(
                provider=self.name,
                available=False,
                model=self.model,
                error=str(e),
            )

    def get_provider_name(self) -> str:
        return self.name


class VoiceService:
    """Voice service managing multiple providers."""

    def __init__(self):
        self.settings = get_settings()
        self._providers: dict[str, VoiceProviderBase] = {}
        self._default_provider: Optional[VoiceProviderBase] = None
        self._initialized = False

    def _initialize_providers(self):
        """Initialize all configured providers."""
        if self._initialized:
            return

        # Always add mock provider as fallback
        self._providers["mock"] = MockVoiceProvider()

        # Add OpenAI-compatible provider if configured
        if self.settings.llm_api_key and self.settings.llm_provider in ("openai", "openai-compatible"):
            self._providers["openai"] = OpenAICompatibleProvider(
                api_key=self.settings.llm_api_key,
                base_url=self.settings.llm_base_url,
                model=self.settings.llm_model,
                timeout=self.settings.llm_timeout,
            )

        # Add Gemini provider if configured
        if self.settings.llm_api_key and self.settings.llm_provider == "gemini":
            self._providers["gemini"] = GeminiProvider(
                api_key=self.settings.llm_api_key,
                model=self.settings.llm_model,
                timeout=self.settings.llm_timeout,
            )

        # Set default provider
        default_name = self.settings.llm_provider if self.settings.llm_provider in self._providers else "mock"
        self._default_provider = self._providers.get(default_name) or self._providers["mock"]

        self._initialized = True

    def get_provider(self, name: Optional[str] = None) -> VoiceProviderBase:
        """Get a provider by name, or the default provider."""
        self._initialize_providers()

        if name and name in self._providers:
            return self._providers[name]

        return self._default_provider

    def get_available_providers(self) -> list[str]:
        """Get list of available provider names."""
        self._initialize_providers()
        return list(self._providers.keys())

    async def process_command(self, request: VoiceCommandRequest) -> VoiceCommandResponse:
        """Process a voice command using the specified or default provider."""
        provider = self.get_provider(request.provider if request.provider else None)
        return await provider.process_command(request)

    async def check_all_providers(self) -> list[VoiceProviderStatus]:
        """Check availability of all providers."""
        self._initialize_providers()
        results = []
        for provider in self._providers.values():
            results.append(await provider.check_availability())
        return results


_voice_service: Optional[VoiceService] = None


def get_voice_service() -> VoiceService:
    """Get the global voice service instance."""
    global _voice_service
    if _voice_service is None:
        _voice_service = VoiceService()
    return _voice_service


async def close_voice_service():
    """Close the voice service (no-op for now, but consistent with other services)."""
    global _voice_service
    _voice_service = None