# Business App with Docker

The canonical Compose file runs the complete Business App stack without
changing the ports reserved by Communications App or JTrade.

| Service | Host port | Container port |
| --- | ---: | ---: |
| Backend | 3004 | 3004 |
| Frontend | 3005 | 3005 |
| Business Intelligence | 8000 | 8000 |
| Redis | 6380 | 6379 |

## Prerequisites

1. Copy and complete `backend/.env.example` as `backend/.env`.
2. Copy and complete `business-intelligence/.env.example` as
   `business-intelligence/.env`.
3. Optionally copy `.env.docker.example` as `.env` to override published ports.
4. Ensure Communications App is available on host port 3001.
5. Ensure the Neon PostgreSQL URL is reachable. BI applies `alembic upgrade
   head` before every start; the command is idempotent.

The backend connects to Redis and BI through the internal Docker network. It
reaches Communications App through `host.docker.internal:3001`. MongoDB and
Neon remain externally managed and are not created by this Compose project.

## Commands

Run all commands from `business-app/`:

```bash
docker compose build
docker compose up -d
docker compose ps
docker compose logs -f backend frontend bi
docker compose down
```

The previous Redis-only Compose file under `backend/` has been removed. Use
this root Compose file for both the full stack and individual services, for
example `docker compose up -d redis`.

`docker compose down` preserves the Redis volume. To intentionally remove the
Redis data as well, use `docker compose down --volumes`.

Health endpoints:

- Backend: `http://localhost:3004/health`
- Frontend: `http://localhost:3005`
- BI: `http://localhost:8000/health`
