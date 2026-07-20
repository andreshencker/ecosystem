"""Tests for the /internal/semantic endpoints."""
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


def test_index_requires_token(client):
    resp = client.get("/internal/semantic")
    assert resp.status_code == 401


def test_index_lists_all_domains(client):
    resp = client.get(
        "/internal/semantic",
        headers={"x-internal-service-token": TOKEN},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "domains" in body
    for d in ("businesses", "users", "customers", "contracts", "shifts", "invoices"):
        assert d in body["domains"]
    assert "detail" in body
    assert "shifts" in body["detail"]
    assert "measures" in body["detail"]["shifts"]


def test_domain_detail_returns_full_semantic(client):
    resp = client.get(
        "/internal/semantic/invoices",
        headers={"x-internal-service-token": TOKEN},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["domain"] == "invoices"
    assert "dimensions" in body
    assert "measures" in body
    assert "kpis" in body
    assert "invoice_count" in body["measures"]


def test_domain_detail_404_for_unknown(client):
    resp = client.get(
        "/internal/semantic/nonexistent_xyz",
        headers={"x-internal-service-token": TOKEN},
    )
    assert resp.status_code == 404
