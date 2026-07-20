"""Registry mapping model names to their ETL pipeline factories.

Pipelines are registered at import time (see app/etl/__init__.py).
The SyncManager looks up factories here to run per-model syncs.
"""
from typing import Callable, Dict, Optional


class SyncRegistry:
    """Maps model names to their pipeline factory callables."""

    _pipelines: Dict[str, Callable] = {}

    @classmethod
    def register(cls, model_name: str, factory: Callable) -> None:
        """Register a pipeline factory for a model name."""
        cls._pipelines[model_name] = factory

    @classmethod
    def get(cls, model_name: str) -> Optional[Callable]:
        """Return the factory for model_name, or None if not registered."""
        return cls._pipelines.get(model_name)

    @classmethod
    def registered(cls) -> list:
        """Return all registered model names."""
        return list(cls._pipelines.keys())

    @classmethod
    def all_names(cls) -> list:
        """Backwards-compatible alias for registered()."""
        return cls.registered()
