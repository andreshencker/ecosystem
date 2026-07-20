"""Typed ETL result — returned by loaders and pipeline orchestrators."""
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional


@dataclass
class LoadResult:
    model_name: str
    company_id: str
    extracted: int = 0
    transformed: int = 0
    inserted: int = 0
    updated: int = 0
    skipped: int = 0
    failed: int = 0
    errors: List[str] = field(default_factory=list)
    cursor: Optional[str] = None  # ISO timestamp of last processed record
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
