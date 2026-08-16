from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.bootstrap import ensure_app_user
from app.core.config import get_settings
from app.core.database import SessionLocal
from app.routers import auth, calculator, images, journals, orders, pnl, tags

settings = get_settings()

app = FastAPI(title="Trading Journal API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(journals.router)
app.include_router(orders.router)
app.include_router(tags.router)
app.include_router(images.router)
app.include_router(pnl.router)
app.include_router(calculator.router)


@app.on_event("startup")
def on_startup() -> None:
    db = SessionLocal()
    try:
        ensure_app_user(db)
    finally:
        db.close()


@app.get("/api/health")
def health():
    return {"status": "ok"}
