"""Voice API endpoints."""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional

from app.services.voice import get_voice_service, VoiceService
from app.models.schemas import (
    VoiceCommandRequest,
    VoiceCommandResponse,
    VoiceProviderStatus,
    VoiceProvider,
    ErrorResponse,
)

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