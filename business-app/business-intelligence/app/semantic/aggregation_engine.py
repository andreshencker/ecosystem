"""Aggregation engine — builds SQLAlchemy SELECT statements from semantic requests.

Uses the SemanticRegistry to resolve dimensions and measures into columns on
the domain's SQLAlchemy model. Callers pass a list of measures + optional
dimensions/filters and receive a select() statement ready for execution.

Every query is scoped by the tenant identifier resolved via the domain's
`company_id` dimension. The isolation filter is non-optional.
"""
from typing import Any, Dict, List, Tuple

from sqlalchemy import Select, and_, case, func, select

from app.semantic.registry.semantic_registry import SemanticRegistry

AGGREGATION_FUNCS = {
    "sum": func.sum,
    "count": func.count,
    "avg": func.avg,
    "min": func.min,
    "max": func.max,
}


def _resolve_isolation_column(dimensions: dict, model_cls: type) -> Any:
    """Return the SQLAlchemy column used for tenant isolation.

    Prefers a `company_id` dimension, falls back to the model's business_id
    attribute.
    """
    dim = dimensions.get("company_id") or dimensions.get("business_id")
    col_name = dim["column"] if dim else "business_id"
    return getattr(model_cls, col_name)


class AggregationEngine:
    """Translates semantic queries into SQLAlchemy select() statements."""

    def build_query(
        self,
        domain: str,
        business_id: str,
        measures: List[str],
        filters: Dict[str, Any],
        group_by: List[str],
        limit: int = 100,
        offset: int = 0,
    ) -> Tuple[Select, List[str]]:
        """Build a SQLAlchemy select() for the requested measures.

        Returns (stmt, label_names) where label_names describe the SELECT
        column aliases in order.
        """
        domain_def = SemanticRegistry.get_domain(domain)
        model_cls = domain_def["model_cls"]
        if model_cls is None:
            raise ValueError(f"Domain '{domain}' has no SQLAlchemy model.")
        dim_defs: dict = domain_def["dimensions"]
        measure_defs: dict = domain_def["measures"]

        # Tenant isolation is mandatory
        isolation_col = _resolve_isolation_column(dim_defs, model_cls)
        where_clauses = [isolation_col == business_id]

        # Apply user-supplied dimension filters
        for filter_dim, filter_val in (filters or {}).items():
            if filter_dim not in dim_defs:
                raise ValueError(
                    f"Unknown dimension for filter: {filter_dim}"
                )
            col_name = dim_defs[filter_dim]["column"]
            where_clauses.append(getattr(model_cls, col_name) == filter_val)

        select_cols: list = []
        label_names: List[str] = []

        # group-by dimensions first
        for dim_name in group_by or []:
            if dim_name not in dim_defs:
                raise ValueError(
                    f"Unknown dimension for group_by: {dim_name}"
                )
            col_name = dim_defs[dim_name]["column"]
            select_cols.append(getattr(model_cls, col_name).label(dim_name))
            label_names.append(dim_name)

        # measures
        for measure_name in measures or []:
            if measure_name not in measure_defs:
                raise ValueError(f"Unknown measure: {measure_name}")
            mdef = measure_defs[measure_name]
            col = getattr(model_cls, mdef["column"])
            agg_names = mdef.get("aggregations", ["sum"])
            agg_fn = AGGREGATION_FUNCS.get(agg_names[0], func.sum)

            measure_filter = mdef.get("filter")
            if measure_filter:
                # Conditional aggregation: only aggregate rows matching the filter
                filter_col, filter_val = next(iter(measure_filter.items()))
                filter_column = getattr(model_cls, filter_col)
                # Use CASE WHEN filter THEN col END to null out non-matching rows
                conditional = case(
                    (filter_column == filter_val, col),
                    else_=None,
                )
                if agg_fn is func.count:
                    expr = func.coalesce(func.count(conditional), 0)
                else:
                    expr = func.coalesce(agg_fn(conditional), 0)
                select_cols.append(expr.label(measure_name))
            else:
                if agg_fn is func.count:
                    expr = func.coalesce(func.count(col), 0)
                else:
                    expr = func.coalesce(agg_fn(col), 0)
                select_cols.append(expr.label(measure_name))
            label_names.append(measure_name)

        if not select_cols:
            raise ValueError(
                "At least one measure or group_by dimension is required."
            )

        stmt = select(*select_cols).where(and_(*where_clauses))

        if group_by:
            group_cols = [
                getattr(model_cls, dim_defs[d]["column"]) for d in group_by
            ]
            stmt = stmt.group_by(*group_cols)

        stmt = stmt.limit(limit).offset(offset)
        return stmt, label_names
