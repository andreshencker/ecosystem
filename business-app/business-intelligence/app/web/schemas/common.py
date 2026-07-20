"""Common response types shared across all web API endpoints."""
from typing import Any, Optional
from pydantic import BaseModel


class ErrorResponse(BaseModel):
    detail: str
    code:   Optional[str] = None
    meta:   Optional[Any] = None
