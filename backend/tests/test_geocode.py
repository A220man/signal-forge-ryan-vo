import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
from app.main import create_app
from app.services.geocoding import NominatimClient, get_geocoding_client, close_geocoding_client
from app.models.schemas import GeocodeResult


@pytest.fixture
def app():
    return create_app()


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def mock_nominatim_response():
    return [
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
            "icon": "https://nominatim.openstreetmap.org/ui/mapicons/poi_place_city.p.20.png",
            "address": {
                "city": "London",
                "county": "Greater London",
                "state": "England",
                "country": "United Kingdom",
                "country_code": "gb",
            },
            "boundingbox": ["51.2868", "51.6919", "-0.5104", "0.3350"],
        }
    ]


@pytest.fixture(autouse=True)
async def reset_geocoding_client():
    """Reset the geocoding client singleton between tests."""
    await close_geocoding_client()
    yield
    await close_geocoding_client()


@pytest.mark.asyncio
async def test_geocode_returns_results(client: AsyncClient, mock_nominatim_response):
    with patch.object(NominatimClient, "_fetch", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = mock_nominatim_response
        response = await client.get("/api/geocode?q=London")
        assert response.status_code == 200
        data = response.json()
        assert data["query"] == "London"
        assert len(data["results"]) == 1
        assert data["results"][0]["display_name"] == "London, Greater London, England, United Kingdom"
        assert data["cached"] is False


@pytest.mark.asyncio
async def test_geocode_caches_results(client: AsyncClient, mock_nominatim_response):
    with patch.object(NominatimClient, "_fetch", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = mock_nominatim_response
        await client.get("/api/geocode?q=London")
        response = await client.get("/api/geocode?q=London")
        assert response.status_code == 200
        data = response.json()
        assert data["cached"] is True
        assert mock_fetch.call_count == 1


@pytest.mark.asyncio
async def test_geocode_empty_query_returns_empty(client: AsyncClient):
    response = await client.get("/api/geocode?q=")
    assert response.status_code == 200
    data = response.json()
    assert data["results"] == []
    assert data["query"] == ""


@pytest.mark.asyncio
async def test_geocode_missing_query_returns_empty(client: AsyncClient):
    response = await client.get("/api/geocode")
    assert response.status_code == 200
    data = response.json()
    assert data["results"] == []
    assert data["query"] == ""


@pytest.mark.asyncio
async def test_geocode_handles_upstream_error(client: AsyncClient):
    with patch.object(NominatimClient, "_fetch", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.side_effect = Exception("Upstream error")
        response = await client.get("/api/geocode?q=London")
        assert response.status_code == 502
        data = response.json()
        assert "detail" in data
        assert "Geocoding service unavailable" in data["detail"]


@pytest.mark.asyncio
async def test_geocode_result_structure(client: AsyncClient, mock_nominatim_response):
    with patch.object(NominatimClient, "_fetch", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = mock_nominatim_response
        response = await client.get("/api/geocode?q=Paris")
        assert response.status_code == 200
        data = response.json()
        result = data["results"][0]
        assert "place_id" in result
        assert "lat" in result
        assert "lon" in result
        assert "display_name" in result
        assert "class" in result
        assert "type" in result
        assert "importance" in result
        assert isinstance(result["lat"], str)
        assert isinstance(result["lon"], str)
        assert float(result["lat"]) == 51.5074
        assert float(result["lon"]) == -0.1278