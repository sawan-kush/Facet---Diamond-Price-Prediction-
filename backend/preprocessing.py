"""Feature construction that mirrors the training pipeline exactly.

Training used:  pd.get_dummies(df, columns=['cut', 'color', 'clarity'], dtype=int)
followed by StandardScaler on the resulting 26 columns. At inference we repeat
the encoding, align to the saved ``feature_columns`` (missing dummies -> 0) and
keep the saved column order. The scalers are only ever used with ``transform``.
"""
from __future__ import annotations

from typing import Iterable, Mapping

import numpy as np
import pandas as pd

NUMERIC_FEATURES = ["carat", "depth", "table", "x", "y", "z"]
CATEGORICAL_FEATURES = ["cut", "color", "clarity"]

# Distance (in training standard deviations) beyond which we warn the user.
OUT_OF_RANGE_Z = 4.0


class PreprocessingError(ValueError):
    """Raised when inputs cannot be mapped onto the model's feature space."""


def categories_from_columns(feature_columns: Iterable[str]) -> dict[str, list[str]]:
    """Recover the category levels the model knows about from its dummy columns."""
    levels: dict[str, list[str]] = {c: [] for c in CATEGORICAL_FEATURES}
    for col in feature_columns:
        for cat in CATEGORICAL_FEATURES:
            prefix = f"{cat}_"
            if col.startswith(prefix):
                levels[cat].append(col[len(prefix):])
    return levels


def build_feature_frame(raw: Mapping[str, object], feature_columns: list[str]) -> pd.DataFrame:
    """Original diamond characteristics -> one-row frame in training column order."""
    missing = [k for k in NUMERIC_FEATURES + CATEGORICAL_FEATURES if k not in raw]
    if missing:
        raise PreprocessingError(f"Missing input fields: {', '.join(missing)}")

    df = pd.DataFrame([{k: raw[k] for k in NUMERIC_FEATURES + CATEGORICAL_FEATURES}])
    encoded = pd.get_dummies(df, columns=CATEGORICAL_FEATURES, dtype=int)

    unknown = [c for c in encoded.columns if c not in feature_columns]
    if unknown:
        # A category the model never saw. Zero-filling would silently predict
        # for a different diamond, so refuse instead.
        raise PreprocessingError(
            "Value(s) not seen during training: " + ", ".join(sorted(unknown))
        )

    aligned = encoded.reindex(columns=feature_columns, fill_value=0)
    return aligned.astype("float64")


def range_warnings(
    raw: Mapping[str, object],
    feature_columns: list[str],
    mean: np.ndarray,
    scale: np.ndarray,
) -> list[str]:
    """Human-readable cautions when an input is far from the training data."""
    warnings: list[str] = []
    for name in NUMERIC_FEATURES:
        idx = feature_columns.index(name)
        z = (float(raw[name]) - mean[idx]) / scale[idx]
        if abs(z) > OUT_OF_RANGE_Z:
            direction = "above" if z > 0 else "below"
            warnings.append(
                f"{name} ({raw[name]}) is far {direction} the typical training range "
                f"(mean {mean[idx]:.2f}); the estimate may be less reliable."
            )

    x, y, z_mm = float(raw["x"]), float(raw["y"]), float(raw["z"])
    implied_depth = 2 * z_mm / (x + y) * 100
    if abs(implied_depth - float(raw["depth"])) > 3:
        warnings.append(
            f"Depth % ({raw['depth']}) does not match the dimensions entered "
            f"(they imply about {implied_depth:.1f}%). Check x, y, z and depth."
        )
    return warnings
