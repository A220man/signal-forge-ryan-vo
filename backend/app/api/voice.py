"""Voice API endpoints."""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from pydantic import BaseModel

from app.services.voice import get_voice_service, VoiceService
from app.models.schemas import (
    VoiceCommandRequest,
    VoiceCommandResponse,
    VoiceProviderStatus,
    VoiceProvider,
    ErrorResponse,
)


class ProviderConfigRequest(BaseModel):
    """Request to configure a voice provider at runtime."""
    name: str
    provider_type: str  # openai, gemini, mock
    api_key: str
    base_url: Optional[str] = None
    model: Optional[str] = None
    timeout: Optional[float] = None
    set_as_default: bool = True


class ProviderConfigResponse(BaseModel):
    """Response for provider configuration."""
    success: bool
    message: str
    provider_name: Optional[str] = None


router = APIRouter(prefix="/api/voice", tags=["voice"])



@router.post(
    "/command",
    response_model=VoiceCommandResponse,
    responses={400: {"model": ErrorResponse}, 502: {"model": ErrorResponse}},
)
async def voice_command(
    request: VoiceCommandRequest,
    service: VoiceService = Depends(get_voice_service),
) -> VoiceCommandResponse:
    """Process a voice command through the configured LLM provider."""
    try:
        return await service.process_command(request)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Voice service error: {str(e)}",
        )


@router.get(
    "/providers",
    response_model=list[VoiceProviderStatus],
    responses={502: {"model": ErrorResponse}},
)
async def list_providers(
    service: VoiceService = Depends(get_voice_service),
) -> list[VoiceProviderStatus]:
    """List all configured providers and their availability."""
    try:
        return await service.check_all_providers()
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Voice service error: {str(e)}",
        )


@router.get(
    "/providers/{provider_name}",
    response_model=VoiceProviderStatus,
    responses={404: {"model": ErrorResponse}, 502: {"model": ErrorResponse}},
)
async def get_provider_status(
    provider_name: str,
    service: VoiceService = Depends(get_voice_service),
) -> VoiceProviderStatus:
    """Get status of a specific provider."""
    try:
        providers = await service.check_all_providers()
        provider = next((p for p in providers if p.provider == provider_name), None)
        if not provider:
            raise HTTPException(status_code=404, detail=f"Provider '{provider_name}' not found")
        return provider
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Voice service error: {str(e)}",
        )
@router.post(
    "/providers/configure",
    response_model=ProviderConfigResponse,
    responses={400: {"model": ErrorResponse}, 502: {"model": ErrorResponse}},
)
async def configure_provider(
    request: ProviderConfigRequest,
    service: VoiceService = Depends(get_voice_service),
) -> ProviderConfigResponse:
    """Configure a voice provider at runtime."""
    try:
        success = service.register_provider(
            name=request.name,
            provider_type=request.provider_type,
            api_key=request.api_key,
            base_url=request.base_url,
            model=request.model,
            timeout=request.timeout,
        )
        if not success:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported provider type: '{request.provider_type}'",
            )

        if request.set_as_default:
            service.set_default_provider(request.name)

        return ProviderConfigResponse(
            success=True,
            message=f"Provider '{request.name}' configured successfully",
            provider_name=request.name,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Voice service error: {str(e)}",
        )


@router.post(
    "/providers/{provider_name}/default",
    response_model=ProviderConfigResponse,
    responses={404: {"model": ErrorResponse}, 502: {"model": ErrorResponse}},
)
async def set_default_provider(
    provider_name: str,
    service: VoiceService = Depends(get_voice_service),
) -> ProviderConfigResponse:
    """Set a provider as the default."""
    try:
        success = service.set_default_provider(provider_name)
        if not success:
            raise HTTPException(
                status_code=404,
                detail=f"Provider '{provider_name}' not found",
            )
        return ProviderConfigResponse(
            success=True,
            message=f"Default provider set to '{provider_name}'",
            provider_name=provider_name,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Voice service error: {str(e)}",
        )