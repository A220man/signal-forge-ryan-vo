import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch
from app.main import create_app
from app.models.schemas import CameraStatus
from app.services.cameras import close_camera_service, get_camera_service


@pytest.fixture
def app():
    return create_app()


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture(autouse=True)
async def reset_camera_service():
    """Reset the camera service singleton between tests."""
    await close_camera_service()


async def _disable_health_checks():
    """Helper to disable health checks on the current service instance."""
    service = get_camera_service()
    service.disable_health_checks()


@pytest.mark.asyncio
async def test_cameras_returns_list(client: AsyncClient):
    await _disable_health_checks()
    response = await client.get("/api/cameras")
    assert response.status_code == 200
    data = response.json()
    assert "cameras" in data
    assert isinstance(data["cameras"], list)
    assert len(data["cameras"]) > 0
    assert "timestamp" in data
    assert "cached" in data


@pytest.mark.asyncio
async def test_cameras_structure(client: AsyncClient):
    await _disable_health_checks()
    response = await client.get("/api/cameras")
    assert response.status_code == 200
    data = response.json()

    camera = data["cameras"][0]
    assert "id" in camera
    assert "name" in camera
    assert "lat" in camera
    assert "lng" in camera
    assert "image_url" in camera
    assert "status" in camera
    assert camera["status"] in [s.value for s in CameraStatus]
    assert "source" in camera


@pytest.mark.asyncio
async def test_cameras_bbox_filter(client: AsyncClient):
    await _disable_health_checks()
    # Filter to Austin area
    response = await client.get(
        "/api/cameras",
        params={"min_lat": 30.0, "min_lng": -98.0, "max_lat": 31.0, "max_lng": -97.0},
    )
    assert response.status_code == 200
    data = response.json()

    for camera in data["cameras"]:
        assert 30.0 <= camera["lat"] <= 31.0
        assert -98.0 <= camera["lng"] <= -97.0


@pytest.mark.asyncio
async def test_cameras_invalid_bbox(client: AsyncClient):
    await _disable_health_checks()
    response = await client.get(
        "/api/cameras",
        params={"min_lat": 31.0, "min_lng": -97.0, "max_lat": 30.0, "max_lng": -98.0},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_cameras_missing_bbox_params(client: AsyncClient):
    await _disable_health_checks()
    # Missing one bbox param should return all cameras
    response = await client.get("/api/cameras", params={"min_lat": 30.0})
    assert response.status_code == 200
    data = response.json()
    assert len(data["cameras"]) > 0


@pytest.mark.asyncio
async def test_camera_proxy_not_found(client: AsyncClient):
    await _disable_health_checks()
    response = await client.get("/api/cameras/nonexistent/proxy")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_cameras_caching(client: AsyncClient):
    await _disable_health_checks()
    # First request
    response1 = await client.get("/api/cameras")
    assert response1.status_code == 200
    data1 = response1.json()
    assert data1["cached"] is False

    # Second request should be cached
    response2 = await client.get("/api/cameras")
    assert response2.status_code == 200
    data2 = response2.json()
    assert data2["cached"] is True