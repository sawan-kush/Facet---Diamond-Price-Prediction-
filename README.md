# Facet — Diamond Price Prediction

A full-stack app around your trained TensorFlow/Keras ANN. Enter a diamond's measurements and grades; the
FastAPI backend runs **your** `diamond_price_ann.keras` and returns the price in **Indian rupees**.

- **Frontend:** React 19, TypeScript, Tailwind CSS 4, Lucide, Recharts (Vite)
- **Backend:** FastAPI, TensorFlow/Keras, scikit-learn, pandas, NumPy, joblib
- No retraining happens anywhere. Scalers are only ever `transform`-ed, never refitted.

Deployed Project URL: https://facet-diamond-price-prediction.vercel.app/

```
Diamond-Price-Prediction/
├── backend/
│   ├── main.py            app factory, CORS, startup (loads model once), error handlers
│   ├── routes.py          GET /health · POST /predict · GET /exchange-rate · GET /model-info
│   ├── schemas.py         Pydantic request/response models and input ranges
│   ├── preprocessing.py   one-hot encode → align to feature_columns → keep order
│   ├── model.py           loads model + scalers + columns, cross-checks their shapes
│   ├── prediction.py      encode → scale → ANN → inverse-scale → convert
│   ├── currency.py        live USD→INR rate, cache, stale/fallback handling
│   ├── config.py          environment settings
│   ├── sample_prediction.py   run sample stones through the real model (no server)
│   ├── tests/             pytest suite (runs against the real model)
│   ├── artifacts/         diamond_price_ann.keras, X_scaler.pkl, y_scaler.pkl,
│   │                      feature_columns.pkl, metrics.json
│   ├── requirements.txt · requirements-dev.txt · .env.example
├── frontend/              Vite + React + TS app (src/components, pages, hooks, services, styles)
├── render.yaml            Render blueprint for the API
└── README.md
```

## Run locally

Built and tested on **Python 3.12** and **Node 22** (other recent versions should work but were not tested).

**Backend** (terminal 1)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # Windows: copy .env.example .env
uvicorn main:app --reload --port 8000
```

**Frontend** (terminal 2)

```bash
cd frontend
npm install
cp .env.example .env               # Windows: copy .env.example .env
npm run dev
```

| What | URL |
|---|---|
| App | http://localhost:5173 |
| API | http://localhost:8000 |
| Interactive API docs | http://localhost:8000/docs |

> `scikit-learn` must stay at **1.6.1** — your scalers were pickled with it. If `tensorflow-cpu` has no wheel for
> your platform, replace it with `tensorflow==2.21.0` in `requirements.txt`.

## How a prediction works

1. The form sends the original characteristics (`carat, cut, color, clarity, depth, table, x, y, z`).
2. `pd.get_dummies(..., columns=['cut','color','clarity'], dtype=int)` is applied, exactly as in training.
3. Columns are aligned to `feature_columns.pkl` (missing dummies → 0, order preserved). A category the model
   never saw is rejected, not silently zero-filled.
4. `X_scaler.transform` → ANN → `y_scaler.inverse_transform` gives the price in the model's own currency.
5. That currency is **USD**: the target scaler has mean ≈ 3,939 and std ≈ 3,990, which matches the classic USD
   diamonds dataset. The backend converts: `INR = USD × USD/INR rate`. Set `MODEL_OUTPUT_CURRENCY=INR` if your
   model really outputs rupees; no conversion is applied then.
6. The response carries the INR price, the USD prediction, the rate, its source and date.

Startup cross-checks that `feature_columns` (26), `X_scaler` (26) and the model input (26) agree, and refuses to
start otherwise.

### Exchange rate

Frankfurter (ECB reference rates) first, then ExchangeRate-API. A fetched rate is cached for 6 hours
(`EXCHANGE_RATE_TTL_SECONDS`). If both fail: the last fetched rate is reused and flagged **stale**; if there is none,
`FALLBACK_USD_INR` is used and flagged **fallback**; with neither, `/predict` returns a 503. The UI always shows
which of these applies, plus the rate's date.

### Model analytics

The four headline metrics (`backend/artifacts/metrics.json`) are the figures you supplied: Training R² 98.20%,
Testing R² 98.11%, MAE 296.13, RMSE 547.99 (shown in USD, the model's currency, with a rupee equivalent).

The **Actual vs Predicted** and **Training vs Validation loss** charts are *not* shown by default, because
neither the training history nor the test predictions were supplied and nothing is fabricated. To enable them, add
`backend/artifacts/evaluation.json` and restart the API. Export it from your notebook:

```python
import json
json.dump({
    "history": {"loss": history.history["loss"], "val_loss": history.history.get("val_loss", [])},
    "actual_vs_predicted": {            # original currency (USD), i.e. after inverse_transform
        "actual": y_test_usd.ravel().tolist(),
        "predicted": y_pred_usd.ravel().tolist(),
    },
}, open("evaluation.json", "w"))
```

Either key may be omitted. At most 1,500 scatter points are drawn.

## Tests

```bash
cd backend && pip install -r requirements-dev.txt && pytest          # 313 tests
python sample_prediction.py                                           # real-model sample stones
cd ../frontend && npm test && npm run typecheck && npm run build
```

Sample prices are generated by your model at run time; none are stored or hardcoded. For rupee figures:
`USD_INR=94.58 python sample_prediction.py`.

## Deploy

### Backend → Render

1. Push this repo to GitHub.
2. Render → **New → Blueprint** → select the repo (it reads `render.yaml`), or create a **Web Service** with
   root directory `backend`, build `pip install -r requirements.txt`, start
   `uvicorn main:app --host 0.0.0.0 --port $PORT`, health check `/health`.
3. Set `ALLOWED_ORIGINS` to your Vercel URL (no trailing slash). Keep `FALLBACK_USD_INR` reasonably current.
4. TensorFlow needs about 1 GB of RAM, so Render's 512 MB free tier is expected to run out of memory — use a
   paid instance. The first request after a cold start is slower while the model loads.

### Frontend → Vercel

1. Vercel → **Add New Project** → import the repo, set **Root Directory** to `frontend`
   (framework: Vite; `vercel.json` handles the build and SPA routing).
2. Add environment variable `VITE_API_URL` = your Render URL, e.g. `https://diamond-price-api.onrender.com`.
3. Deploy, then put the resulting Vercel URL into the backend's `ALLOWED_ORIGINS` and redeploy the API.

## Environment variables

Backend (`backend/.env.example`): `ALLOWED_ORIGINS`, `MODEL_OUTPUT_CURRENCY`, `EXCHANGE_RATE_TTL_SECONDS`,
`EXCHANGE_RATE_TIMEOUT_SECONDS`, `FALLBACK_USD_INR`, `FALLBACK_RATE_DATE`.
Frontend (`frontend/.env.example`): `VITE_API_URL`.

## Notes

- Estimates come from a statistical model and are not a certified appraisal.
- The backend warns when an input is far outside the training distribution, or when depth % disagrees with the
  entered x, y, z.
- Design is inspired by the structure and restraint of payloadcms.com; no Payload branding, copy or layouts are used.
