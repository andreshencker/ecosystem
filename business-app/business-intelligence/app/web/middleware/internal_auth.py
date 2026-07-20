# Re-exports InternalAuthMiddleware from core/security.py for the web layer.
# core/security.py is kept unchanged as per architecture constraints.
from app.core.security import InternalAuthMiddleware  # noqa: F401

__all__ = ["InternalAuthMiddleware"]
