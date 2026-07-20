"""Error response helpers for the web layer."""
from fastapi.responses import JSONResponse
from fastapi import status


def not_found(detail: str = "Resource not found") -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": detail},
    )


def bad_request(detail: str) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": detail},
    )


def internal_error(detail: str = "Internal server error") -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": detail},
    )
