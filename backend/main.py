import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import Base, engine
from .routers import auth, products, categories, transactions


logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Inventory API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "" if os.getenv("VERCEL") else "/api"
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(products.router, prefix=API_PREFIX)
app.include_router(categories.router, prefix=API_PREFIX)
app.include_router(transactions.router, prefix=API_PREFIX)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    # TODO replace with Alembic migrations for production


@app.get(f"{API_PREFIX}/health")
def health():
    return {"status": "ok"}


@app.get("/")
def root():
    return {"status": "ok"}
