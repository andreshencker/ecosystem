#!/bin/sh
set -eu

echo "Applying Business Intelligence database migrations..."
alembic upgrade head

echo "Starting Business Intelligence on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
