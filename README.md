# Trading Journal

A personal trading journal: log trading days, record orders, manually link
closing orders to earlier ones (same ticker, partial closes supported) to
track realized P&L, and score potential trades with a configurable
"Entry Quality Calculator."

See `claude/DesignDecisions.md` in the attached Claude project for the full
list of design decisions behind this stack.

## Stack

- **Backend:** Python, FastAPI, SQLAlchemy, Alembic, PostgreSQL
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, React Query
- **Auth:** Single-user login (no registration/email flow) — one username/password set via `.env`

## Prerequisites

- Docker Desktop

That's it — Postgres, the backend, and the frontend all run as containers via `docker compose`. You don't need Python or Node installed locally.

## First-time setup

### 1. Root `.env` (Postgres credentials, read by `docker compose`)

```bash
cp .env.example .env
```

The defaults work fine as-is; edit the values if you want your own credentials.

### 2. `backend/.env` (app secrets, read by the backend container)

```bash
cp backend/.env.example backend/.env
```

Fill in the same `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` you put in the root `.env` (`POSTGRES_HOST` doesn't matter here — Compose overrides it to `db` automatically for the container), plus your login credentials. Generate a password hash for your login:

```bash
docker compose run --rm backend python scripts/hash_password.py "your-password-here"
```

(This spins up a one-off backend container just to run the script — no local Python needed. If `docker compose run` complains that the image doesn't exist yet, run `docker compose build backend` first.)

Copy the printed hash into `APP_PASSWORD_HASH=` in `backend/.env`, wrapped in single quotes (e.g. `APP_PASSWORD_HASH='$2b$12$abcd...'`). Also set `APP_USERNAME` to whatever username you want to log in with.

> **Why two separate `.env` files?** Docker Compose interpolates any `$` it finds in `.env` values against its own variable table, which mangles a bcrypt hash (it's practically nothing but `$`-delimited segments) if it's in a file Compose parses. The root `.env` (Postgres only, no secrets) is the one Compose's top-level `${...}` substitution reads. `backend/.env` is never passed through Compose's env parsing at all — it's bind-mounted into the backend container as a plain file, and the FastAPI app reads it directly. Don't add `environment:`/`env_file:` entries for secrets to `docker-compose.yml`, and don't merge these two files back together.

### 3. Build and start everything

```bash
docker compose up --build
```

First run builds the backend and frontend images (a minute or two) and runs DB migrations automatically on backend startup. Subsequent runs are just `docker compose up -d`.

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000 (docs at `/docs`)
- Postgres: `localhost:5432`

Open http://localhost:5173 and log in with the username/password you set above.

## Day-to-day usage

```bash
docker compose up -d       # start everything in the background
docker compose logs -f     # tail logs from all services
docker compose down        # stop everything (data persists in the tj_pgdata volume)
```

Both backend and frontend source directories are bind-mounted into their containers, so code edits on your machine hot-reload inside the containers (uvicorn `--reload`, Vite HMR) without rebuilding the image. You only need `docker compose up --build` again after changing `requirements.txt` or `package.json`.

## Project structure

```
docker-compose.yml   db + backend + frontend services
backend/
  Dockerfile
  app/
    core/       settings, DB session, auth/security, single-user bootstrap
    models/     SQLAlchemy models (User, Journal, Tag, OrderItem, OrderLink, EntryQualityFactor, images)
    schemas/    Pydantic request/response schemas
    routers/    API endpoints (auth, journals, orders, tags, images, pnl, calculator)
  alembic/      DB migrations (run automatically on container start)
  scripts/hash_password.py   generates a bcrypt hash for your login password
frontend/
  Dockerfile
  src/
    api/        axios client, typed hooks (React Query) for every endpoint
    auth/       auth context (JWT stored in localStorage)
    components/ Layout (sidebar nav) and route guard
    pages/      Login, Home, Journal detail, P&L, Entry Quality Calculator
```

### Running natively without Docker (optional)

Everything above assumes Docker for all three services. If you ever want to run the backend or frontend directly on your machine instead (e.g. for debugging), that still works: `backend/app/core/config.py` resolves `backend/.env` by an absolute path, so it loads correctly regardless of which directory you launch `uvicorn`/`alembic` from. You'd need Python 3.11+ and Node 20+ installed, a venv with `pip install -r backend/requirements.txt`, `npm install` in `frontend/`, and `POSTGRES_HOST=localhost` in `backend/.env` (Postgres itself can still run via `docker compose up db`). This isn't the primary documented workflow, though — Docker for everything is simpler and is what's tested.

## Notes on the data model

- **Order linking is manual, same-ticker only.** From an order's card in the journal detail page, click "Link" to pick an earlier opposite-direction order on the same ticker and how many shares to link — no automatic FIFO matching. Partial closes are supported: an order can be linked from/to multiple other orders until its quantity is fully accounted for.
- **P&L** is computed from linked order pairs (buy price vs. sell price × linked quantity) and rolled up on the P&L page.
- **Options trading** (strike price, expiration, IV) is intentionally out of scope for now; the `OrderItem` model can be extended later without a rewrite.
- **Images** (journal and order) are stored as blobs directly in Postgres, not on disk.
