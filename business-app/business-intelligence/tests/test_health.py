from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app, raise_server_exceptions=False)


def test_health_returns_200():
    response = client.get("/health")
    assert response.status_code == 200


def test_health_response_has_required_fields():
    """Verify the health response matches the documented shape."""
    response = client.get("/health")
    body = response.json()

    assert "status" in body
    assert body["status"] in ("healthy", "degraded")

    assert "version" in body
    assert body["version"] == "0.1.0"

    assert "database" in body
    assert body["database"] in ("connected", "unavailable")

    assert "provider" in body
    assert body["provider"] == "Neon PostgreSQL"

    assert "server_version" in body
    assert "warehouse" in body
    assert body["warehouse"] in ("online", "offline")
