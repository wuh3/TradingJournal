FROM python:3.11-slim

WORKDIR /app

# System deps needed to build psycopg (even the [binary] wheel install is smoother with these present)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Run migrations then start the API. Runs every container start, which is a
# cheap no-op once the DB is already up to date.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]
