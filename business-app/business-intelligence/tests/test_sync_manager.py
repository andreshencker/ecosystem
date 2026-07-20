"""Tests for SyncManager and SyncRegistry."""
import asyncio

import pytest


def _run(coro):
    """Run an async coroutine in a fresh event loop for a sync test."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def test_sync_unknown_model_raises():
    # Ensure the invoice pipeline is registered before calling.
    import app.etl  # noqa: F401 — registers pipelines
    from app.etl.sync.sync_manager import SyncManager

    manager = SyncManager()
    with pytest.raises(ValueError, match="No pipeline registered"):
        _run(manager.sync("company-1", "unknown_model_xyz"))


def test_sync_concurrency_lock():
    import app.etl  # noqa: F401
    from app.etl.sync.sync_manager import SyncManager, _locks

    manager = SyncManager()
    _locks["company-lock:invoice"] = True
    try:
        with pytest.raises(RuntimeError, match="already running"):
            _run(manager.sync("company-lock", "invoice"))
    finally:
        _locks.pop("company-lock:invoice", None)


def test_sync_registry_has_invoice_pipeline():
    import app.etl  # noqa: F401
    from app.etl.sync.sync_registry import SyncRegistry

    assert "invoice" in SyncRegistry.registered()


def test_sync_registry_returns_none_for_missing():
    from app.etl.sync.sync_registry import SyncRegistry

    assert SyncRegistry.get("nonexistent_xyz") is None
