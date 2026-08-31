from fastapi import FastAPI

from app.api.routes_auth import router as auth_router
from app.api.routes_inspections import router as inspections_router
from app.core.config import settings

app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION)

app.include_router(auth_router)
app.include_router(inspections_router)


@app.get("/")
def root():
    return {"name": settings.APP_NAME, "version": settings.APP_VERSION}


@app.get("/health")
def health():
    return {"status": "ok"}