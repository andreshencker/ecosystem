import hmac
import os
from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware


class InternalAuthMiddleware(BaseHTTPMiddleware):
    """
    Middleware that protects all /internal/* routes with an internal service token.
    Runs before any route handler or dependency — guaranteed before DB access.

    Token is read from BI_INTERNAL_SERVICE_TOKEN env var at dispatch time
    so that test patches (patch.dict) work without reimporting the module.

    Exempt: /health (no token required).
    All /internal/* routes require header:  x-internal-service-token: <token>
    """

    async def dispatch(self, request: Request, call_next):
        if not request.url.path.startswith("/internal"):
            return await call_next(request)

        # Read from env at dispatch time — allows test patches to work
        expected = os.environ.get("BI_INTERNAL_SERVICE_TOKEN", "")
        token = request.headers.get("x-internal-service-token", "")

        if not expected:
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": "BI_INTERNAL_SERVICE_TOKEN not configured"},
            )

        if not token or not hmac.compare_digest(token, expected):
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Invalid service token"},
            )

        return await call_next(request)
