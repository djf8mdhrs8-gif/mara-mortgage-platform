# Local development environment

## Prerequisites

- Node 22+ (`node --version`)
- pnpm 11 (`corepack enable` will pick up the version pinned in `package.json`)
- Docker Desktop (for Postgres + Redis) — https://www.docker.com/products/docker-desktop/

## First-time setup

```sh
pnpm install
cp .env.example .env        # then edit values if needed
docker compose up -d        # starts Postgres 17 + Redis 7 with health checks
```

Verify the containers are healthy:

```sh
docker compose ps           # both services should show "healthy"
docker compose exec postgres psql -U mara -d mara_mortgage -c 'select 1;'
docker compose exec redis redis-cli ping   # PONG
```

## Day-to-day

```sh
docker compose up -d        # start infra
pnpm dev                    # run apps (turbo)
docker compose down         # stop infra (data persists in named volumes)
```

`docker compose down -v` wipes the database volumes — only use it when you
want a truly fresh database.

## Ports

| Service  | Host port (default) | Override via `.env` |
|----------|---------------------|---------------------|
| Postgres | 5432                | `POSTGRES_PORT`     |
| Redis    | 6379                | `REDIS_PORT`        |
| API      | 3001                | `API_PORT`          |
