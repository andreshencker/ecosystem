"""
Tests for the internal service token middleware (InternalAuthMiddleware).
Middleware reads BI_INTERNAL_SERVICE_TOKEN from os.environ at dispatch time,
so os.environ patches stay effective during test execution.
"""
import os
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

TOKEN = "test-secret-token-abc123"


@pytest.fixture
def client():
    """
    TestClient fixture with BI token patched for the entire test duration.
    Uses yield so patch stays active while the test body runs.
    """
    with patch.dict(os.environ, {"BI_INTERNAL_SERVICE_TOKEN": TOKEN}):
        from app.main import app
        with TestClient(app, raise_server_exceptions=False) as c:
            yield c


def test_health_does_not_require_token(client):
    response = client.get("/health")
    assert response.status_code == 200


def test_internal_without_token_returns_401(client):
    response = client.get("/internal/customers/summary", params={"businessId": "x"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid service token"


def test_internal_with_wrong_token_returns_401(client):
    response = client.get(
        "/internal/customers/summary",
        params={"businessId": "x"},
        headers={"x-internal-service-token": "wrong-token"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid service token"


def test_internal_with_correct_token_passes_middleware(client):
    """
    Correct token passes middleware. Endpoint may return 500 (no DB) but NOT 401.
    """
    response = client.get(
        "/internal/customers/summary",
        params={"businessId": "x"},
        headers={"x-internal-service-token": TOKEN},
    )
    assert response.status_code != 401
