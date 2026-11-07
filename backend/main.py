"""FastAPI application entry point.

Run locally:  uvicorn main:app --reload --port 8000
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import get_settings
from currency import ExchangeRateService, RateUnavailableError
from model import ArtifactError, load_bundle
from prediction import PredictionError, PredictionService
from preprocessing import PreprocessingError
from routes import router

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("diamond")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    # Fail fast: a server that cannot load its model should not report healthy.
    bundle = load_bundle(settings.artifacts_dir)
    rates = ExchangeRateService(settings)
    await rates.start()
    app.state.settings = settings
    app.state.bundle = bundle
    app.state.rates = rates
    app.state.service = PredictionService(bundle, rates, settings)
    log.info("Ready. Model output currency: %s", settings.model_output_currency)
    try:
        yield
    finally:
        await rates.close()


def _error(status: int, code: str, message: str, fields: list[dict] | None = None) -> JSONResponse:
    body: dict = {"code": code, "message": message}
    if fields:
        body["fields"] = fields
    return JSONResponse(status_code=status, content={"error": body})


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Diamond Price Prediction API",
        version="1.0.0",
        description="Serves a pre-trained TensorFlow/Keras ANN. Prices are returned in INR.",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type"],
    )
    app.include_router(router)

    @app.exception_handler(RequestValidationError)
    async def validation_handler(_: Request, exc: RequestValidationError):
        fields = [
            {"field": ".".join(str(p) for p in e["loc"] if p != "body"), "message": e["msg"]}
            for e in exc.errors()
        ]
        return _error(422, "validation_error", "Some inputs are missing or out of range.", fields)

    @app.exception_handler(PreprocessingError)
    async def preprocessing_handler(_: Request, exc: PreprocessingError):
        return _error(422, "unsupported_input", str(exc))

    @app.exception_handler(PredictionError)
    async def prediction_handler(_: Request, exc: PredictionError):
        return _error(422, "unreliable_prediction", str(exc))

    @app.exception_handler(RateUnavailableError)
    async def rate_handler(_: Request, exc: RateUnavailableError):
        return _error(503, "exchange_rate_unavailable", str(exc))

    @app.exception_handler(ArtifactError)
    async def artifact_handler(_: Request, exc: ArtifactError):
        return _error(500, "artifact_error", str(exc))

    @app.exception_handler(Exception)
    async def unhandled(_: Request, exc: Exception):
        log.exception("Unhandled error", exc_info=exc)
        return _error(500, "internal_error", "Something went wrong while predicting. Please try again.")

    return app


app = create_app()
