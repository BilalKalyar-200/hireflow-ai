"""
HireFlow AI — Health Endpoint Tests.

Tests GET /health returns 200 with expected status fields.
Uses MOCK_QWEN and in-memory storage — no external services required.
"""

import os

os.environ.setdefault("MOCK_QWEN", "true")

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_returns_200() -> None:
    """
    Verify health endpoint returns healthy status.

    Input: GET /health
    Output: asserts status_code 200 and status field is healthy
    """
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "token_usage" in data


def test_health_includes_app_name() -> None:
    """
    Verify health response includes application name.

    Input: GET /health
    Output: asserts app field is present
    """
    response = client.get("/health")
    data = response.json()
    assert data["app"] == "HireFlow AI"
