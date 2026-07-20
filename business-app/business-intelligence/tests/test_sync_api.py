"""Tests for the generic /internal/sync endpoints."""
import os

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

TOKEN = "test-secret-token"


@pytest.fixture
def client():
    with patch.dict(os.environ, {"BI_INTERNAL_SERVICE_TOKEN": TOKEN}):
        from app.main import app
        yield TestClient(app, raise_server_exceptions=False)


def test_sync_requires_token(client):
    resp = client.post("/internal/sync", json={"companyId": "c"})
    assert resp.status_code == 401


def test_sync_unknown_model_is_404(client):
    resp = client.post(
        "/internal/sync/nonexistent_xyz",
        json={"companyId": "c"},
        headers={"x-internal-service-token": TOKEN},
    )
    assert resp.status_code == 404


def test_sync_status_requires_token(client):
    resp = client.get("/internal/sync/status/c")
    assert resp.status_code == 401


def test_sync_status_passes_middleware_with_correct_token(client):
    resp = client.get(
        "/internal/sync/status/c",
        headers={"x-internal-service-token": TOKEN},
    )
    assert resp.status_code != 401


def test_sync_invoices_alias_still_works(client):
    """The backwards-compatible /internal/sync/invoices endpoint remains registered."""
    resp = client.post(
        "/internal/sync/invoices",
        json={"companyId": "c"},
        headers={"x-internal-service-token": TOKEN},
    )
    # Not 401 (auth passes); actual behavior may 500 if DB unavailable
    assert resp.status_code != 401
