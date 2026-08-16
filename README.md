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

- Docker Desktop (for PostgreSQL)
- Python 3.11+
- Node.js 20+

## First-time setup

### 1. Start PostgreSQL

```bash
cp .env.example .env
docker compose up -d
```

This starts a Postgres container on `localhost:5432` using the credentials in `.env`.

### 2. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp ../.env .env   # backend reads its own .env in this directory
```

Generate a password hash for your login and put it in `backend/.env`:

```bash
python scripts/hash_password.py "your-password-here"
```

Copy the printed hash into `APP_PASSWORD_HASH=` in `backend/.env` (keep the surrounding quotes if the hash contains `$` characters — the example already shows the format). Also set `APP_USERNAME` to whatever username you want to log in with.

Run migrations and start the API:

```bash
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

The API is now running at http://localhost:8000 (interactive docs at `/docs`). On startup it creates your single user account from `APP_USERNAME` / `APP_PASSWORD_HASH`.

### 3. Frontend

In a new terminal:

```bash
cd frontend
npm install
cp .env.example .env   # points the frontend at http://localhost:8000 by default
npm run dev
```

Open http://localhost:5173 and log in with the username/password you set above.

## Day-to-day usage

Once set up, starting the app is just:

```bash
docker compose up -d                 # from repo root
cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000
cd frontend && npm run dev            # in another terminal
```

## Project structure

```
backend/
  app/
    core/       settings, DB session, auth/security, single-user bootstrap
    models/     SQLAlchemy models (User, Journal, Tag, OrderItem, OrderLink, EntryQualityFactor, images)
    schemas/    Pydantic request/response schemas
    routers/    API endpoints (auth, journals, orders, tags, images, pnl, calculator)
  alembic/      DB migrations
  scripts/hash_password.py   generates a bcrypt hash for your login password
frontend/
  src/
    api/        axios client, typed hooks (React Query) for every endpoint
    auth/       auth context (JWT stored in localStorage)
    components/ Layout (sidebar nav) and route guard
    pages/      Login, Home, Journal detail, P&L, Entry Quality Calculator
```

## Notes on the data model

- **Order linking is manual, same-ticker only.** From an order's card in the journal detail page, click "Link" to pick an earlier opposite-direction order on the same ticker and how many shares to link — no automatic FIFO matching. Partial closes are supported: an order can be linked from/to multiple other orders until its quantity is fully accounted for.
- **P&L** is computed from linked order pairs (buy price vs. sell price × linked quantity) and rolled up on the P&L page.
- **Options trading** (strike price, expiration, IV) is intentionally out of scope for now; the `OrderItem` model can be extended later without a rewrite.
- **Images** (journal and order) are stored as blobs directly in Postgres, not on disk.
