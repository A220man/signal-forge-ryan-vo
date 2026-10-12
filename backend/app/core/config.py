from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "Signal Forge"
    app_version: str = "1.0.0"
    environment: str = "development"

    # CORS
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # Geocoding (Nominatim)
    nominatim_base_url: str = "https://nominatim.openstreetmap.org"
    nominatim_user_agent: str = "signal-forge/1.0"
    nominatim_rate_limit: float = 1.0  # requests per second
    geocode_cache_ttl: int = 3600  # seconds

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    # Demo mode (local only)
    demo_mode: bool = True


@lru_cache
def get_settings() -> Settings:
    return Settings()