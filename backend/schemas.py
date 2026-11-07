"""Pydantic request / response models."""
from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

Cut = Literal["Fair", "Good", "Very Good", "Premium", "Ideal"]
Color = Literal["D", "E", "F", "G", "H", "I", "J"]
Clarity = Literal["I1", "SI2", "SI1", "VS2", "VS1", "VVS2", "VVS1", "IF"]


class DiamondInput(BaseModel):
    """A diamond as the user describes it (original, un-encoded features)."""

    carat: float = Field(..., ge=0.2, le=6.0, description="Weight in carats")
    cut: Cut
    color: Color
    clarity: Clarity
    depth: float = Field(..., ge=40, le=80, description="Total depth percentage")
    table: float = Field(..., ge=40, le=100, description="Table width percentage")
    x: float = Field(..., ge=2.0, le=12.0, description="Length in mm")
    y: float = Field(..., ge=2.0, le=12.0, description="Width in mm")
    z: float = Field(..., ge=1.0, le=8.0, description="Depth in mm")


class RateInfo(BaseModel):
    base: Literal["USD"] = "USD"
    quote: Literal["INR"] = "INR"
    rate: float
    source: str = Field(description="Where the rate came from")
    as_of: str = Field(description="Date/time the source says the rate refers to")
    fetched_at: datetime = Field(description="When this server obtained the rate (UTC)")
    is_fallback: bool = Field(
        description="True when the configured fallback rate is in use because no live rate was available"
    )
    is_stale: bool = Field(
        description="True when a previously fetched rate is reused after a refresh failed"
    )
    note: Optional[str] = None


class ModelOutput(BaseModel):
    value: float
    currency: Literal["USD", "INR"]


class PredictionResponse(BaseModel):
    price_inr: float
    price_usd: Optional[float] = Field(
        default=None, description="Raw model prediction when the model outputs USD"
    )
    model_output: ModelOutput
    converted: bool = Field(description="Whether a currency conversion was applied")
    exchange_rate: Optional[RateInfo] = None
    input: DiamondInput
    warnings: list[str] = []
    predicted_at: datetime


class ErrorBody(BaseModel):
    code: str
    message: str
    fields: Optional[list[dict]] = None


class ErrorResponse(BaseModel):
    error: ErrorBody
