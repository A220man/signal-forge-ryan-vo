from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime


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


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)