"""Semantic metadata endpoints — expose registered domains, relationships, and capabilities.

GET /internal/semantic            — list all domains with summary
GET /internal/semantic/{domain}   — full detail for one domain (dims, measures, KPIs, relationships)
"""
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.semantic.registry.semantic_registry import SemanticRegistry

router = APIRouter(prefix="/internal/semantic", tags=["semantic"])


# ── Response schemas ──────────────────────────────────────────────────────────


class RelationshipSummary(BaseModel):
    target_domain: str
    join_type: str
    description: str


class DomainSummary(BaseModel):
    dimensions: List[str]
    measures: List[str]
    kpis: List[str]
    relationships: List[RelationshipSummary] = []
    has_model: bool = True


class SemanticIndexResponse(BaseModel):
    domains: List[str]
    detail: Dict[str, DomainSummary]


class RelationshipDetail(BaseModel):
    target_domain: str
    local_key: str
    foreign_key: str
    join_type: str
    description: str


class DomainDetailResponse(BaseModel):
    domain: str
    dimensions: Dict[str, Any]
    measures: Dict[str, Any]
    kpis: Dict[str, Any]
    relationships: List[RelationshipDetail] = []
    has_model: bool


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.get("", response_model=SemanticIndexResponse)
@router.get("/", response_model=SemanticIndexResponse)
async def list_domains() -> SemanticIndexResponse:
    """List all registered domains with their dimension/measure/KPI names and relationships."""
    detail = {}
    for name, summary in SemanticRegistry.all_domains_detail().items():
        detail[name] = DomainSummary(
            dimensions=summary["dimensions"],
            measures=summary["measures"],
            kpis=summary["kpis"],
            relationships=[
                RelationshipSummary(**r) for r in summary.get("relationships", [])
            ],
            has_model=summary.get("has_model", True),
        )
    return SemanticIndexResponse(
        domains=SemanticRegistry.all_domains(),
        detail=detail,
    )


@router.get("/{domain}", response_model=DomainDetailResponse)
async def get_domain(domain: str) -> DomainDetailResponse:
    """Return full semantic detail for one domain, including relationship metadata."""
    try:
        d = SemanticRegistry.get_domain(domain)
    except KeyError:
        raise HTTPException(404, f"Domain '{domain}' not found. "
                            f"Available: {SemanticRegistry.all_domains()}")
    return DomainDetailResponse(
        domain=domain,
        dimensions=d["dimensions"],
        measures=d["measures"],
        kpis=d["kpis"],
        relationships=[
            RelationshipDetail(
                target_domain=r["target_domain"],
                local_key=r.get("local_key", ""),
                foreign_key=r.get("foreign_key", ""),
                join_type=r.get("join_type", "left"),
                description=r.get("description", ""),
            )
            for r in d.get("relationships", [])
        ],
        has_model=d.get("model_cls") is not None,
    )
