"""Abstract pipeline base class with lifecycle hooks.

Every ETL pipeline follows the same lifecycle:
    1. before_run()   — pre-flight checks or setup (default: no-op)
    2. run()          — main orchestration: extract → transform → load
    3. validate()     — post-load validation (default: no-op)
    4. after_load()   — notifications, cursor persistence, cleanup (default: no-op)

Concrete pipelines must implement ``run()``. The hooks ``before_run``,
``validate`` and ``after_load`` have empty default implementations so existing
pipelines need no changes.
"""
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional

from app.etl.results import LoadResult


class AbstractPipeline(ABC):
    """Base class for all ETL pipelines.

    A pipeline wires together an extractor, transformer, and loader,
    handles errors, and reports a typed :class:`LoadResult`.

    Lifecycle
    ---------
    ::

        before_run()   (hook — override to add pre-flight logic)
        run()          (required — orchestrate E→T→L)
        validate()     (hook — override to add post-load assertions)
        after_load()   (hook — override for notifications / cleanup)
    """

    # ── Lifecycle hooks (no-op by default) ──────────────────────────────────

    async def before_run(self, company_id: str, since: Optional[datetime]) -> None:
        """Pre-flight hook called before extraction starts.

        Override to add readiness checks, logging, or resource setup.
        Default implementation is a no-op.
        """

    async def validate(self, result: LoadResult) -> None:
        """Post-load validation hook.

        Called with the completed :class:`LoadResult` before ``after_load``.
        Override to assert invariants (e.g. no unexpected failures).
        Raise ``ValueError`` to mark the run as failed.
        Default implementation is a no-op.
        """

    async def after_load(self, result: LoadResult) -> None:
        """Post-load cleanup hook.

        Called after ``validate`` regardless of outcome.
        Override for cursor persistence, metric emission, or notifications.
        Default implementation is a no-op.
        """

    # ── Main method (required) ───────────────────────────────────────────────

    @abstractmethod
    async def run(
        self,
        company_id: str,
        since: Optional[datetime] = None,
    ) -> LoadResult:
        """Execute the ETL pipeline for a given company and optional cursor.

        Args:
            company_id: Tenant identifier.
            since: Optional datetime cursor for incremental sync.

        Returns:
            A :class:`LoadResult` with row counts and errors.
        """
        raise NotImplementedError

    # ── Convenience runner (calls full lifecycle) ────────────────────────────

    async def execute(
        self,
        company_id: str,
        since: Optional[datetime] = None,
    ) -> LoadResult:
        """Run the full pipeline lifecycle.

        Calls ``before_run → run → validate → after_load`` in order.
        Concrete pipelines are free to call ``run()`` directly if they
        want to skip the hook chain (e.g. from within ``FullSyncPipeline``).
        """
        await self.before_run(company_id, since)
        result = await self.run(company_id, since)
        await self.validate(result)
        await self.after_load(result)
        return result
