# Communications App with Docker

The canonical Compose file runs Communications App without conflicting with
JTrade or Business App.

| Service | Host port | Container port |
| --- | ---: | ---: |
| Frontend | 3000 | 3000 |
| Backend | 3001 | 3001 |
| Redis | 6379 | 6379 |

## Prerequisites

1. Copy and complete `backend/.env.example` as `backend/.env`.
2. Optionally copy `frontend/.env.local.example` as `frontend/.env.local` for
   non-Docker frontend development.
3. Optionally copy `.env.docker.example` as `.env` to override published ports
   or set the public browser API key used by legacy engine calls.
4. Ensure MongoDB Atlas and any configured S3, SMTP, SMS, calendar, accounting
   or payment providers are reachable from Docker.

Redis runs inside the Compose network as `redis:6379`. The backend `.env` can
keep `REDIS_HOST=localhost` for direct local development because Compose
overrides it only inside the container.

## Commands

Run all commands from `communications-app/`:

```bash
docker compose build
docker compose up -d
docker compose ps
docker compose logs -f backend frontend
docker compose down
```

The previous Redis-only Compose file under `backend/` has been removed. To run
only Redis, use `docker compose up -d redis` from this directory.

`docker compose down` preserves `communications_redis_data`. Use
`docker compose down --volumes` only when Redis data should be intentionally
discarded.

Health endpoints:

- Backend: `http://localhost:3001/health`
- Frontend: `http://localhost:3000`
