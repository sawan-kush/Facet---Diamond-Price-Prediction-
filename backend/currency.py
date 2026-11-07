"""USD -> INR conversion with a live rate, caching and explicit fallbacks.

Order of preference:
  1. a fresh cached live rate
  2. a live rate from the primary source, then the secondary source
  3. the previously fetched rate (flagged ``is_stale``)
  4. the configured fallback rate (flagged ``is_fallback``)
  5. otherwise raise ``RateUnavailableError`` -> HTTP 503

A rate is never invented: every response says where it came from and how old it is.
"""
from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Awaitable, Callable, Optional

import httpx

from config import Settings
from schemas import RateInfo

log = logging.getLogger("diamond.currency")

FRANKFURTER_URL = "https://api.frankfurter.dev/v1/latest?base=USD&symbols=INR"
OPEN_ER_API_URL = "https://open.er-api.com/v6/latest/USD"

# Reject obviously broken payloads rather than convert with them.
MIN_PLAUSIBLE_RATE, MAX_PLAUSIBLE_RATE = 20.0, 300.0

# After every live source fails, wait this long before trying them again so an
# outage does not add two timeouts to every prediction request.
RETRY_COOLDOWN_SECONDS = 30.0


class RateUnavailableError(RuntimeError):
    pass


def _validate(rate: object) -> float:
    r = float(rate)  # type: ignore[arg-type]
    if not (MIN_PLAUSIBLE_RATE <= r <= MAX_PLAUSIBLE_RATE):
        raise ValueError(f"implausible USD/INR rate {r}")
    return r


async def _frankfurter(client: httpx.AsyncClient) -> tuple[float, str, str]:
    resp = await client.get(FRANKFURTER_URL)
    resp.raise_for_status()
    data = resp.json()
    return _validate(data["rates"]["INR"]), "Frankfurter (ECB reference rates)", f"{data['date']} (daily reference rate)"


async def _open_er_api(client: httpx.AsyncClient) -> tuple[float, str, str]:
    resp = await client.get(OPEN_ER_API_URL)
    resp.raise_for_status()
    data = resp.json()
    if data.get("result") != "success":
        raise ValueError("open.er-api.com reported failure")
    return _validate(data["rates"]["INR"]), "ExchangeRate-API (open access)", str(data.get("time_last_update_utc", "unknown"))


Source = Callable[[httpx.AsyncClient], Awaitable[tuple[float, str, str]]]


class ExchangeRateService:
    def __init__(
        self,
        settings: Settings,
        client: Optional[httpx.AsyncClient] = None,
        sources: Optional[list[Source]] = None,
    ) -> None:
        self._settings = settings
        self._client = client
        self._owns_client = client is None
        self._sources: list[Source] = sources or [_frankfurter, _open_er_api]
        self._cached: Optional[RateInfo] = None
        self._cached_monotonic = 0.0
        self._last_failure: Optional[float] = None
        self._lock = asyncio.Lock()

    async def start(self) -> None:
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=self._settings.exchange_rate_timeout_seconds,
                headers={"User-Agent": "diamond-price-prediction/1.0"},
            )

    async def close(self) -> None:
        if self._client is not None and self._owns_client:
            await self._client.aclose()

    @property
    def has_cached_rate(self) -> bool:
        return self._cached is not None

    def _fresh(self) -> bool:
        return (
            self._cached is not None
            and not self._cached.is_fallback
            and not self._cached.is_stale
            and time.monotonic() - self._cached_monotonic < self._settings.exchange_rate_ttl_seconds
        )

    async def get_rate(self) -> RateInfo:
        if self._fresh():
            return self._cached  # type: ignore[return-value]
        async with self._lock:
            if self._fresh():  # another request refreshed while we waited
                return self._cached  # type: ignore[return-value]
            await self.start()
            assert self._client is not None

            errors: list[str] = []
            cooling_down = (
                self._last_failure is not None
                and time.monotonic() - self._last_failure < RETRY_COOLDOWN_SECONDS
            )
            if cooling_down and self._cached is not None:
                return self._cached
            for source in ([] if cooling_down else self._sources):
                try:
                    rate, name, as_of = await source(self._client)
                except Exception as exc:  # network, HTTP, JSON, validation
                    errors.append(f"{getattr(source, '__name__', 'source')}: {exc}")
                    continue
                self._cached = RateInfo(
                    rate=rate, source=name, as_of=as_of,
                    fetched_at=datetime.now(timezone.utc),
                    is_fallback=False, is_stale=False,
                )
                self._cached_monotonic = time.monotonic()
                self._last_failure = None
                return self._cached

            if not cooling_down:
                self._last_failure = time.monotonic()
            log.warning("All live exchange-rate sources failed: %s", "; ".join(errors))

            # 3. reuse the last live rate, clearly marked as stale
            if self._cached is not None and not self._cached.is_fallback:
                stale = self._cached.model_copy(update={
                    "is_stale": True,
                    "note": "Live rate sources are unreachable; showing the last rate fetched.",
                })
                self._cached = stale
                return stale

            # 4. configured fallback, clearly marked
            if self._settings.fallback_usd_inr is not None:
                when = self._settings.fallback_rate_date or "date not provided"
                self._cached = RateInfo(
                    rate=_validate(self._settings.fallback_usd_inr),
                    source="Configured fallback (FALLBACK_USD_INR)",
                    as_of=when,
                    fetched_at=datetime.now(timezone.utc),
                    is_fallback=True, is_stale=False,
                    note="Live rate sources are unreachable; using the configured fallback rate.",
                )
                self._cached_monotonic = 0.0  # always retry live sources next time
                return self._cached

            raise RateUnavailableError(
                "No live USD/INR rate is available and no FALLBACK_USD_INR is configured."
            )


def usd_to_inr(usd: float, rate: float) -> float:
    """INR price = USD prediction x USD/INR rate."""
    return round(usd * rate, 2)
