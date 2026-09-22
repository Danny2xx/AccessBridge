"""FastAPI entrypoint for AccessBridge AI."""

from __future__ import annotations

import threading
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.config import Settings, get_settings
from app.evidence import get_evidence
from app.schemas import HealthResponse


def health_payload(settings: Settings | None = None) -> HealthResponse:
    """Build the deterministic health response used by the API and tests."""

    resolved_settings = settings or get_settings()
    return HealthResponse(
        service=resolved_settings.app_name,
        slug=resolved_settings.app_slug,
        version=resolved_settings.app_version,
        status="ok",
        stage=resolved_settings.current_stage,
        accessibility_method=resolved_settings.accessibility_method,
    )


def create_app(settings: Settings | None = None) -> FastAPI:
    """Create the FastAPI application."""

    resolved_settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        # Warm the evidence cache off the request path so the story page loads fast.
        threading.Thread(
            target=get_evidence,
            args=(resolved_settings,),
            name="evidence-warmup",
            daemon=True,
        ).start()
        yield

    api = FastAPI(
        title=resolved_settings.app_name,
        version=resolved_settings.app_version,
        summary="Equity-first transit accessibility and routing prototype.",
        lifespan=lifespan,
    )
    api.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:4173",
            "http://127.0.0.1:4173",
        ],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @api.get("/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        return health_payload(resolved_settings)

    api.include_router(router)

    return api


app = create_app()
