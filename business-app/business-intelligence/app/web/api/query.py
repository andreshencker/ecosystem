"""Generic semantic query endpoint.

Accepts a JSON body describing a semantic request (domain, measures,
dimensions, filters, groupBy) and returns rows + computed KPIs.
"""
from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.postgres import get_db
from app.semantic.query_engine import QueryEngine

router = APIRouter(prefix="/internal/query", tags=["query"])


class QueryRequest(BaseModel):
    businessId: str
    domain: str
    dimensions: List[str] = Field(default_factory=list)
    measures: List[str] = Field(default_factory=list)
    kpis: List[str] = Field(default_factory=list)
    filters: Dict[str, Any] = Field(default_factory=dict)
    groupBy: List[str] = Field(default_factory=list)
    orderBy: List[str] = Field(default_factory=list)
    limit: int = Field(default=100, ge=1, le=1000)
    offset: int = Field(default=0, ge=0)


class QueryMetadata(BaseModel):
    businessId: str
    domain: str
    generatedAt: datetime
    rowCount: int
    measures: List[str]
    kpis: List[str]
    groupBy: List[str]


class QueryResponse(BaseModel):
    domain: str
    rows: List[Dict[str, Any]]
    kpis: Dict[str, Any] = Field(default_factory=dict)
    metadata: QueryMetadata


@router.post("", response_model=QueryResponse)
@router.post("/", response_model=QueryResponse)
async def generic_query(
    body: QueryRequest,
    db: AsyncSession = Depends(get_db),
) -> QueryResponse:
    if not body.businessId.strip():
        raise HTTPException(400, "businessId is required")
    if not body.domain.strip():
        raise HTTPException(400, "domain is required")

    try:
        engine = QueryEngine(db)
        result = await engine.execute(
            domain=body.domain,
            business_id=body.businessId.strip(),
            measures=body.measures,
            filters=body.filters,
            group_by=body.groupBy,
            kpis=body.kpis,
            limit=body.limit,
            offset=body.offset,
        )
    except KeyError as exc:
        raise HTTPException(400, f"Unknown domain or field: {exc}")
    except ValueError as exc:
        raise HTTPException(400, str(exc))

    return QueryResponse(
        domain=result["domain"],
        rows=result["rows"],
        kpis=result.get("kpis", {}),
        metadata=QueryMetadata(
            businessId=body.businessId,
            domain=body.domain,
            generatedAt=datetime.now(timezone.utc),
            rowCount=result["metadata"]["rowCount"],
            measures=body.measures,
            kpis=body.kpis,
            groupBy=body.groupBy,
        ),
    )
