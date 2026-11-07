import httpx
import pytest

from config import Settings
from currency import ExchangeRateService, RateUnavailableError, usd_to_inr, _frankfurter, _open_er_api


def svc(handler, **settings):
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return ExchangeRateService(Settings(_env_file=None, **settings), client=client)


def ok_handler(request: httpx.Request):
    if "frankfurter" in request.url.host:
        return httpx.Response(200, json={"base": "USD", "date": "2026-11-06", "rates": {"INR": 94.5}})
    return httpx.Response(200, json={"result": "success", "time_last_update_utc": "Sat, 07 Nov 2026 00:02:31 +0000",
                                     "rates": {"INR": 94.6}})


async def test_primary_source_used_and_cached():
    calls = []
    def handler(r):
        calls.append(str(r.url)); return ok_handler(r)
    s = svc(handler)
    a = await s.get_rate(); b = await s.get_rate()
    assert a.rate == 94.5 and "Frankfurter" in a.source and not a.is_fallback and not a.is_stale
    assert a is b and len(calls) == 1  # second call served from cache


async def test_secondary_used_when_primary_fails():
    def handler(r):
        return httpx.Response(500) if "frankfurter" in r.url.host else ok_handler(r)
    rate = await svc(handler).get_rate()
    assert rate.rate == 94.6 and "ExchangeRate-API" in rate.source


async def test_implausible_rate_is_rejected():
    def handler(r):
        return httpx.Response(200, json={"date": "2026-11-06", "rates": {"INR": 0.5}}) if "frankfurter" in r.url.host else httpx.Response(500)
    with pytest.raises(RateUnavailableError):
        await svc(handler).get_rate()


async def test_fallback_is_flagged_not_silent():
    s = svc(lambda r: httpx.Response(503), fallback_usd_inr=94.58, fallback_rate_date="2026-11-04")
    rate = await s.get_rate()
    assert rate.rate == 94.58 and rate.is_fallback and rate.as_of == "2026-11-04" and rate.note


async def test_no_live_no_fallback_raises():
    with pytest.raises(RateUnavailableError):
        await svc(lambda r: httpx.Response(503)).get_rate()


async def test_stale_rate_reused_and_flagged_when_refresh_fails():
    state = {"up": True}
    def handler(r):
        return ok_handler(r) if state["up"] else httpx.Response(500)
    s = svc(handler, exchange_rate_ttl_seconds=60)
    first = await s.get_rate()
    state["up"] = False
    s._cached_monotonic -= 3600  # age the cache past its TTL
    again = await s.get_rate()
    assert again.rate == first.rate and again.is_stale and not again.is_fallback


def test_conversion_formula():
    assert usd_to_inr(1000, 94.58) == 94580.0
    assert usd_to_inr(6125.14, 94.5) == pytest.approx(578826.0, abs=1)
