"""Query engine — executes semantic queries against the data warehouse.

Uses AggregationEngine to build the statement, executes it against the
PostgreSQL session, and normalises the result set. All Decimal values are
serialised as strings to preserve numeric precision.
"""
import logging
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.semantic.aggregation_engine import AggregationEngine
from app.semantic.registry.semantic_registry import SemanticRegistry

logger = logging.getLogger(__name__)

TWO_PLACES = Decimal("0.01")


def _serialize(value: Any) -> Any:
    """Convert row values into JSON-safe representations."""
    if value is None:
        return None
    if isinstance(value, Decimal):
        return str(value.quantize(TWO_PLACES))
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return value


class QueryEngine:
    """Executes semantic queries and returns structured results."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._agg = AggregationEngine()

    async def execute(
        self,
        domain: str,
        business_id: str,
        measures: Optional[List[str]] = None,
        filters: Optional[Dict[str, Any]] = None,
        group_by: Optional[List[str]] = None,
        kpis: Optional[List[str]] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """Execute a semantic query.

        Returns a dict with:
            domain: str
            rows: List[dict]  — one dict per SELECT row
            kpis: dict        — computed KPI values
            metadata: dict    — businessId, rowCount, echoed request context
        """
        # Validate domain
        domain_def = SemanticRegistry.get_domain(domain)

        measures = measures or []
        filters = filters or {}
        group_by = group_by or []
        kpis = kpis or []

        rows: List[Dict[str, Any]] = []
        if measures or group_by:
            stmt, label_names = self._agg.build_query(
                domain=domain,
                business_id=business_id,
                measures=measures,
                filters=filters,
                group_by=group_by,
                limit=limit,
                offset=offset,
            )
            result = await self.db.execute(stmt)
            for row in result.all():
                row_dict: Dict[str, Any] = {}
                for i, label in enumerate(label_names):
                    row_dict[label] = _serialize(row[i])
                rows.append(row_dict)

        kpi_results: Dict[str, Any] = {}
        if kpis:
            kpi_defs = domain_def.get("kpis", {})
            for kpi_name in kpis:
                if kpi_name not in kpi_defs:
                    raise ValueError(f"Unknown KPI: {kpi_name}")
                kpi_results[kpi_name] = self._compute_kpi(
                    kpi_name, kpi_defs[kpi_name], rows
                )

        return {
            "domain": domain,
            "rows": rows,
            "kpis": kpi_results,
            "metadata": {
                "businessId": business_id,
                "rowCount": len(rows),
                "measures": measures,
                "kpis": kpis,
                "groupBy": group_by,
            },
        }

    @staticmethod
    def _compute_kpi(
        name: str, kpi_def: dict, rows: List[Dict[str, Any]]
    ) -> Any:
        """Compute a KPI from aggregated row data.

        Supports two shapes:
            {"base_measure": "gross_amount"} — pull from single aggregated row
            {"numerator": "a", "denominator": "b"} — ratio calculation
        """
        format_str = kpi_def.get("format", "")

        if not rows:
            if format_str in ("currency", "percentage"):
                return "0.00"
            if format_str == "days":
                return "0.00"
            if format_str == "hours":
                return "0.00"
            return 0

        base_measure = kpi_def.get("base_measure")
        numerator_key = kpi_def.get("numerator")
        denominator_key = kpi_def.get("denominator")

        if base_measure and base_measure in rows[0]:
            return rows[0][base_measure]

        if numerator_key and denominator_key:
            num_raw = rows[0].get(numerator_key, 0)
            den_raw = rows[0].get(denominator_key, 0)
            try:
                num = Decimal(str(num_raw)) if num_raw is not None else Decimal(0)
                den = Decimal(str(den_raw)) if den_raw is not None else Decimal(0)
            except (ValueError, TypeError):
                return kpi_def.get("zero_division", "0.00")
            if den == 0:
                return kpi_def.get("zero_division", "0.00")
            return str((num / den).quantize(TWO_PLACES))

        return None
