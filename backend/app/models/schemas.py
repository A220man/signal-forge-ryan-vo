from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from enum import Enum


class CameraStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    UNKNOWN = "unknown"


class CameraFeed(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    lat: float
    lng: float
    image_url: str
    status: CameraStatus = CameraStatus.UNKNOWN
    last_checked: Optional[datetime] = None
    source: str
    attribution: Optional[str] = None


class CameraFeedResponse(BaseModel):
    cameras: list[CameraFeed]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    cached: bool = False


class GeocodeResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    place_id: int
    licence: str
    osm_type: str
    osm_id: int
    lat: str
    lon: str
    display_name: str
    class_: str = Field(alias="class")
    type: str
    importance: float
    icon: Optional[str] = None
    address: Optional[dict] = None
    boundingbox: Optional[list[str]] = None


class GeocodeResponse(BaseModel):
    results: list[GeocodeResult]
    query: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    cached: bool = False


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str
    environment: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class VoiceProvider(str, Enum):
    MOCK = "mock"
    OPENAI = "openai"
    GEMINI = "gemini"


class VoiceCommandRequest(BaseModel):
    text: str
    provider: Optional[str] = None
    model: Optional[str] = None


class VoiceCommandResponse(BaseModel):
    success: bool
    text: str
    action: Optional[str] = None
    action_params: Optional[dict] = None
    provider: str
    error: Optional[str] = None


class VoiceProviderStatus(BaseModel):
    provider: str
    available: bool
    model: Optional[str] = None
    error: Optional[str] = None


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)