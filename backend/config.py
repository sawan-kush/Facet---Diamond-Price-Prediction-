"""Application settings, read from environment variables (or a local .env file)."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal, Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    # --- Artifacts ---------------------------------------------------------
    artifacts_dir: Path = BASE_DIR / "artifacts"

    # --- CORS --------------------------------------------------------------
    # Comma-separated list of allowed browser origins.
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # --- Currency ----------------------------------------------------------
    # Currency of the target the ANN was trained on. The training target has a
    # mean of ~3,939 and a std of ~3,990 (see y_scaler.pkl), which matches the
    # classic USD diamonds dataset. Set to INR only if the model really
    # predicts rupees; no conversion is applied in that case.
    model_output_currency: Literal["USD", "INR"] = "USD"

    # How long a fetched USD->INR rate is reused before refreshing.
    exchange_rate_ttl_seconds: int = Field(default=6 * 60 * 60, ge=60)
    exchange_rate_timeout_seconds: float = Field(default=6.0, gt=0)

    # Used ONLY when every live source fails and no previously fetched rate is
    # cached. It is always flagged as a fallback in API responses and the UI.
    fallback_usd_inr: Optional[float] = Field(default=None, gt=0)
    fallback_rate_date: Optional[str] = None  # e.g. "2026-11-04", shown to users

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip().rstrip("/") for o in self.allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
