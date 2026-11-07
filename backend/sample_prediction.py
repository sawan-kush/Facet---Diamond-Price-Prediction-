"""Run realistic sample diamonds through the real model (no server needed).

    python sample_prediction.py

Prices are produced by diamond_price_ann.keras at run time; nothing is hardcoded.
Set USD_INR to see rupee figures, e.g.  USD_INR=94.58 python sample_prediction.py
"""
import os
import warnings

warnings.filterwarnings("ignore")

from config import get_settings  # noqa: E402
from model import load_bundle  # noqa: E402
from prediction import predict_model_units  # noqa: E402

SAMPLES = [
    ("Entry-level round, 0.5 ct", dict(carat=0.50, cut="Good", color="H", clarity="SI1", depth=62.0, table=58.0, x=5.10, y=5.12, z=3.16)),
    ("Classic solitaire, 1.0 ct", dict(carat=1.00, cut="Ideal", color="G", clarity="VS2", depth=61.5, table=57.0, x=6.40, y=6.43, z=3.95)),
    ("Fine stone, 1.5 ct", dict(carat=1.50, cut="Premium", color="F", clarity="VVS2", depth=61.0, table=58.0, x=7.35, y=7.40, z=4.50)),
    ("Statement stone, 2.5 ct", dict(carat=2.50, cut="Very Good", color="E", clarity="VS1", depth=62.0, table=59.0, x=8.65, y=8.70, z=5.37)),
]

if __name__ == "__main__":
    bundle = load_bundle(get_settings().artifacts_dir)
    rate = float(os.getenv("USD_INR", "0")) or None
    print(f"Model input dim: {bundle.input_dim}\n")
    for label, stone in SAMPLES:
        usd = predict_model_units(bundle, stone)
        inr = f"  ≈ INR {usd * rate:,.0f} @ {rate}" if rate else ""
        print(f"{label:28s} USD {usd:>10,.2f}{inr}")
