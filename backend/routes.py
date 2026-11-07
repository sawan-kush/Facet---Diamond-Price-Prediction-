"""HTTP routes. Thin: validation in schemas, logic in prediction/currency/model."""
from __future__ import annotations

from fastapi import APIRouter, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse

from model import describe_bundle
from schemas import DiamondInput, ErrorResponse, PredictionResponse, RateInfo

router = APIRouter()

_ERRORS = {
    422: {"model": ErrorResponse},
    503: {"model": ErrorResponse},
}


@router.get("/health", tags=["system"])
async def health(request: Request):
    state = request.app.state
    loaded = getattr(state, "bundle", None) is not None
    body = {
        "status": "ok" if loaded else "unavailable",
        "model_loaded": loaded,
        "input_dim": state.bundle.input_dim if loaded else None,
        "model_output_currency": state.settings.model_output_currency,
        "exchange_rate_cached": state.rates.has_cached_rate,
    }
    return JSONResponse(body, status_code=200 if loaded else 503)


@router.post("/predict", response_model=PredictionResponse, responses=_ERRORS, tags=["prediction"])
async def predict(payload: DiamondInput, request: Request):
    service = request.app.state.service
    # Keras inference is blocking; keep it off the event loop.
    value, warnings = await run_in_threadpool(service.predict_in_model_units, payload)
    return await service.finish(payload, value, warnings)


@router.get("/exchange-rate", response_model=RateInfo, responses=_ERRORS, tags=["currency"])
async def exchange_rate(request: Request):
    return await request.app.state.rates.get_rate()


@router.get("/model-info", tags=["model"])
async def model_info(request: Request):
    state = request.app.state
    return describe_bundle(state.bundle, state.settings.model_output_currency)
