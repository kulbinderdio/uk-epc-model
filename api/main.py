"""
FastAPI application entry point.

Run:
    uvicorn api.main:app --reload --port 8000
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routers import predict, recommendations
from src.model.predict import load_model
from src.recommendations.lookup import _load_lookup

# In production set ALLOWED_ORIGINS to a comma-separated list of your domain(s).
# e.g. ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"
_origins_env = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = (
    [o.strip() for o in _origins_env.split(",") if o.strip()]
    if _origins_env
    else ["http://localhost:3000", "http://127.0.0.1:3000"]
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_model()
    _load_lookup()
    yield


app = FastAPI(
    title="EPC Rating Predictor",
    description="Predict Energy Performance Certificate ratings from property characteristics",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict.router, prefix="/api")
app.include_router(recommendations.router, prefix="/api")


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok"}
