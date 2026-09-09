from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes_auth import router as auth_router
from app.api.routes_inspections import router as inspections_router
from app.api.routes_extraction import router as extraction_router
from app.api.routes_rag import router as rag_router
from app.api.routes_verdict import router as verdict_router
from app.core.config import settings

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
)

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",

    # Production
    "https://legal-metrology.online",
    "https://www.legal-metrology.online",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(inspections_router)
app.include_router(extraction_router)
app.include_router(verdict_router)
app.include_router(rag_router)

@app.get("/")
def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }

@app.get("/health")
def health():
    return {"status": "ok"}