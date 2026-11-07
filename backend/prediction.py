"""Prediction pipeline: raw inputs -> encoded -> scaled -> ANN -> inverse-scaled -> INR."""
from __future__ import annotations

from datetime import datetime, timezone

import numpy as np

from config import Settings
from currency import ExchangeRateService, usd_to_inr
from model import ModelBundle
from preprocessing import build_feature_frame, range_warnings
from schemas import DiamondInput, ModelOutput, PredictionResponse


class PredictionError(RuntimeError):
    """The model produced a value that cannot be used."""


def predict_model_units(bundle: ModelBundle, raw: dict) -> float:
    """Steps 2-9 of the pipeline. Returns the price in the model's own currency."""
    frame = build_feature_frame(raw, bundle.feature_columns)           # encode + align + order
    scaled = bundle.x_scaler.transform(frame)                          # transform only, never fit (DataFrame keeps names/order checked)
    if scaled.shape != (1, bundle.input_dim):
        raise PredictionError(f"Unexpected feature shape {scaled.shape}; model expects (1, {bundle.input_dim}).")
    scaled_pred = bundle.predict_scaled(scaled)                        # ANN forward pass
    value = float(bundle.y_scaler.inverse_transform(scaled_pred.reshape(-1, 1))[0, 0])
    if not np.isfinite(value):
        raise PredictionError("The model returned a non-finite value.")
    return value


class PredictionService:
    def __init__(self, bundle: ModelBundle, rates: ExchangeRateService, settings: Settings) -> None:
        self.bundle = bundle
        self.rates = rates
        self.settings = settings

    def predict_in_model_units(self, payload: DiamondInput) -> tuple[float, list[str]]:
        raw = payload.model_dump()
        value = predict_model_units(self.bundle, raw)
        if value <= 0:
            raise PredictionError(
                "These measurements fall outside what the model can value reliably "
                "(it produced a non-positive price). Check the entered values."
            )
        warnings = range_warnings(
            raw, self.bundle.feature_columns, self.bundle.x_scaler.mean_, self.bundle.x_scaler.scale_
        )
        return value, warnings

    async def finish(self, payload: DiamondInput, value: float, warnings: list[str]) -> PredictionResponse:
        currency = self.settings.model_output_currency
        value = round(value, 2)  # convert from the figure we display so USD x rate = INR on screen
        if currency == "USD":
            rate = await self.rates.get_rate()
            price_inr = usd_to_inr(value, rate.rate)
            return PredictionResponse(
                price_inr=price_inr,
                price_usd=value,
                model_output=ModelOutput(value=value, currency="USD"),
                converted=True,
                exchange_rate=rate,
                input=payload,
                warnings=warnings,
                predicted_at=datetime.now(timezone.utc),
            )
        # Model already predicts rupees: never convert twice.
        return PredictionResponse(
            price_inr=value,
            price_usd=None,
            model_output=ModelOutput(value=value, currency="INR"),
            converted=False,
            exchange_rate=None,
            input=payload,
            warnings=warnings,
            predicted_at=datetime.now(timezone.utc),
        )
