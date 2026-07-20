"""Generic sync API — trigger and inspect ETL runs.

Endpoints:
    POST /internal/sync                    — trigger full sync
    POST /internal/sync/{model}            — trigger a single model
    GET  /internal/sync/status/{company_id} — current per-model state
    GET  /internal/sync/history/{company_id} — history (most recent first)
"""
from typing import List, Optional

from fastapi import APIRouter, Body, HTTPException, Query
from pydantic import BaseModel

from app.etl.sync.sync_manager import SyncManager
from app.etl.sync.sync_registry import SyncRegistry

router = APIRouter(prefix="/internal/sync", tags=["sync"])
sync_manager = SyncManager()


class SyncRequest(BaseModel):
    companyId: str
    full: bool = False


class SyncResponse(BaseModel):
    model_name: str
    company_id: str
    extracted: int
    transformed: int
    inserted: int
    updated: int
    failed: int
    duration_ms: Optional[int] = None
    errors: List[str] = []


class SyncStateResponse(BaseModel):
    model_name: str
    company_id: str
    last_status: str
    last_cursor: Optional[str] = None
    last_started_at: Optional[str] = None
    last_completed_at: Optional[str] = None
    last_error: Optional[str] = None
    records_processed: int


class SyncStatusResponse(BaseModel):
    companyId: str
    models: List[SyncStateResponse]
    availableModels: List[str]


class SyncHistoryResponse(BaseModel):
    companyId: str
    entries: List[SyncStateResponse]


async def _run_sync(company_id: str, model: str, full: bool) -> SyncResponse:
    try:
        result = await sync_manager.sync(company_id, model, full=full)
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return SyncResponse(
        model_name=result.model_name,
        company_id=result.company_id,
        extracted=result.extracted,
        transformed=result.transformed,
        inserted=result.inserted,
        updated=result.updated,
        failed=result.failed,
        duration_ms=result.duration_ms,
        errors=result.errors,
    )


@router.post("", response_model=SyncResponse, summary="Trigger a full sync for a business")
@router.post("/", response_model=SyncResponse)
async def trigger_full_sync(body: SyncRequest = Body(...)) -> SyncResponse:
    if not body.companyId.strip():
        raise HTTPException(status_code=400, detail="companyId is required")
    return await _run_sync(body.companyId.strip(), "full", body.full)


@router.post(
    "/invoices",
    response_model=SyncResponse,
    summary="Trigger the invoice sync (backwards-compatible alias)",
)
async def trigger_invoice_sync(body: SyncRequest = Body(...)) -> SyncResponse:
    if not body.companyId.strip():
        raise HTTPException(status_code=400, detail="companyId is required")
    return await _run_sync(body.companyId.strip(), "invoice", body.full)


@router.post(
    "/{model}",
    response_model=SyncResponse,
    summary="Trigger a single-model sync",
)
async def trigger_model_sync(
    model: str,
    body: SyncRequest = Body(...),
) -> SyncResponse:
    if not body.companyId.strip():
        raise HTTPException(status_code=400, detail="companyId is required")
    if model not in SyncRegistry.registered():
        raise HTTPException(
            status_code=404,
            detail=f"No pipeline registered for model '{model}'",
        )
    return await _run_sync(body.companyId.strip(), model, body.full)


@router.get(
    "/status/{company_id}",
    response_model=SyncStatusResponse,
    summary="Sync status for every model of a company",
)
async def get_sync_status(company_id: str) -> SyncStatusResponse:
    if not company_id.strip():
        raise HTTPException(status_code=400, detail="company_id is required")
    rows = await sync_manager.get_status(company_id.strip())
    return SyncStatusResponse(
        companyId=company_id.strip(),
        models=[SyncStateResponse(**r) for r in rows],
        availableModels=SyncRegistry.registered(),
    )


@router.get(
    "/history/{company_id}",
    response_model=SyncHistoryResponse,
    summary="Sync history for a company (most recent first)",
)
async def get_sync_history(
    company_id: str,
    limit: int = Query(default=20, ge=1, le=200),
) -> SyncHistoryResponse:
    if not company_id.strip():
        raise HTTPException(status_code=400, detail="company_id is required")
    rows = await sync_manager.get_history(company_id.strip(), limit=limit)
    return SyncHistoryResponse(
        companyId=company_id.strip(),
        entries=[SyncStateResponse(**r) for r in rows],
    )
