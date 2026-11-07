import pytest
from fastapi.testclient import TestClient

from currency import RateUnavailableError
from main import app
from tests.conftest import SAMPLE, make_rate


class StubRates:
    def __init__(self, rate=None, fail=False):
        self.rate, self.fail = rate or make_rate(90.0), fail
        self.has_cached_rate = True
    async def get_rate(self):
        if self.fail:
            raise RateUnavailableError("No live USD/INR rate is available and no FALLBACK_USD_INR is configured.")
        return self.rate
    async def start(self): ...
    async def close(self): ...


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:   # runs the real startup: loads the real model
        yield c


@pytest.fixture
def stub(client):
    original = client.app.state.rates, client.app.state.service.rates
    s = StubRates()
    client.app.state.rates = client.app.state.service.rates = s
    yield s
    client.app.state.rates, client.app.state.service.rates = original


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["model_loaded"] is True and r.json()["input_dim"] == 26


def test_model_info(client):
    j = client.get("/model-info").json()
    assert j["input_dim"] == 26 and len(j["feature_columns"]) == 26
    assert j["reported_metrics"]["test_r2"] == 0.9811
    assert [l["type"] for l in j["architecture"]] == ["Dense", "Dropout", "Dense", "Dropout", "Dense", "Dense"]
    assert j["evaluation"] is None  # no evaluation.json supplied -> nothing fabricated


def test_predict_converts_usd_to_inr(client, stub):
    r = client.post("/predict", json=SAMPLE)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["converted"] is True and j["model_output"]["currency"] == "USD"
    assert j["price_inr"] == pytest.approx(j["price_usd"] * 90.0, abs=0.005)
    assert j["exchange_rate"]["rate"] == 90.0 and j["exchange_rate"]["is_fallback"] is False
    assert j["price_usd"] > 0


def test_predict_does_not_convert_when_model_outputs_inr(client, stub):
    client.app.state.settings.model_output_currency = "INR"
    try:
        j = client.post("/predict", json=SAMPLE).json()
    finally:
        client.app.state.settings.model_output_currency = "USD"
    assert j["converted"] is False and j["price_usd"] is None and j["exchange_rate"] is None
    assert j["price_inr"] == j["model_output"]["value"]


@pytest.mark.parametrize("patch", [
    {"carat": 0}, {"carat": -1}, {"cut": "Superb"}, {"color": "Z"}, {"clarity": "XX"},
    {"depth": 5}, {"table": 500}, {"x": 0}, {"z": "abc"},
])
def test_invalid_inputs_return_structured_422(client, stub, patch):
    r = client.post("/predict", json={**SAMPLE, **patch})
    assert r.status_code == 422
    err = r.json()["error"]
    assert err["code"] == "validation_error" and err["fields"]


def test_missing_field_422(client, stub):
    body = dict(SAMPLE); body.pop("clarity")
    r = client.post("/predict", json=body)
    assert r.status_code == 422 and any(f["field"] == "clarity" for f in r.json()["error"]["fields"])


def test_exchange_rate_endpoint(client, stub):
    j = client.get("/exchange-rate").json()
    assert j["rate"] == 90.0 and j["base"] == "USD" and j["quote"] == "INR"


def test_rate_outage_gives_503_not_a_made_up_price(client):
    original = client.app.state.rates, client.app.state.service.rates
    client.app.state.rates = client.app.state.service.rates = StubRates(fail=True)
    try:
        r = client.post("/predict", json=SAMPLE)
    finally:
        client.app.state.rates, client.app.state.service.rates = original
    assert r.status_code == 503 and r.json()["error"]["code"] == "exchange_rate_unavailable"


def test_cors_allows_dev_origin_only(client):
    ok = client.options("/predict", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST",
                                             "Access-Control-Request-Headers": "content-type"})
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:5173"
    bad = client.options("/predict", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"})
    assert "access-control-allow-origin" not in bad.headers
