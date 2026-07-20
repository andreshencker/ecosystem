import pytest


@pytest.fixture(autouse=True)
def reset_settings(monkeypatch):
    """Ensure each test starts with a clean settings state."""
    yield
