"""Loading and describing the trained ANN plus its preprocessing artifacts."""
from __future__ import annotations

import json
import logging
import os
import threading
import zipfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")  # quiet TensorFlow's C++ logs

import joblib  # noqa: E402
import keras  # noqa: E402
import numpy as np  # noqa: E402

from preprocessing import categories_from_columns  # noqa: E402

log = logging.getLogger("diamond.model")

MODEL_FILE = "diamond_price_ann.keras"
X_SCALER_FILE = "X_scaler.pkl"
Y_SCALER_FILE = "y_scaler.pkl"
FEATURES_FILE = "feature_columns.pkl"
METRICS_FILE = "metrics.json"          # headline metrics reported by the model author
EVALUATION_FILE = "evaluation.json"    # optional: training history + test predictions


class ArtifactError(RuntimeError):
    """Artifacts are missing or inconsistent with each other."""


@dataclass
class ModelBundle:
    model: Any
    x_scaler: Any
    y_scaler: Any
    feature_columns: list[str]
    artifacts_dir: Path
    keras_file_version: Optional[str] = None
    lock: threading.Lock = field(default_factory=threading.Lock, repr=False)

    # -- inference ---------------------------------------------------------
    def predict_scaled(self, scaled_features: np.ndarray) -> np.ndarray:
        """Run the ANN. Returns the model's raw (still target-scaled) output."""
        with self.lock:  # one forward pass at a time keeps Keras happy under threads
            out = self.model(scaled_features.astype("float32"), training=False)
        return np.asarray(out)

    # -- introspection -----------------------------------------------------
    @property
    def input_dim(self) -> int:
        return int(self.model.input_shape[-1])

    def architecture(self) -> list[dict]:
        layers = []
        for layer in self.model.layers:
            cfg = layer.get_config()
            entry: dict[str, Any] = {
                "name": layer.name,
                "type": layer.__class__.__name__,
                "params": int(layer.count_params()),
            }
            if "units" in cfg:
                entry["units"] = cfg["units"]
            if "activation" in cfg:
                entry["activation"] = cfg["activation"] if isinstance(cfg["activation"], str) else str(cfg["activation"])
            if "rate" in cfg:
                entry["dropout_rate"] = cfg["rate"]
            reg = cfg.get("kernel_regularizer")
            if isinstance(reg, dict) and "l2" in reg.get("config", {}):
                entry["l2"] = reg["config"]["l2"]
            layers.append(entry)
        return layers


def _require(path: Path) -> Path:
    if not path.is_file():
        raise ArtifactError(f"Missing artifact: {path}")
    return path


def _read_keras_file_version(path: Path) -> Optional[str]:
    try:
        with zipfile.ZipFile(path) as z:
            return json.loads(z.read("metadata.json")).get("keras_version")
    except Exception:  # metadata is informational only
        return None


def load_bundle(artifacts_dir: Path) -> ModelBundle:
    """Load model + scalers + feature columns once and cross-check them."""
    artifacts_dir = Path(artifacts_dir)
    model_path = _require(artifacts_dir / MODEL_FILE)
    x_scaler = joblib.load(_require(artifacts_dir / X_SCALER_FILE))
    y_scaler = joblib.load(_require(artifacts_dir / Y_SCALER_FILE))
    feature_columns = list(joblib.load(_require(artifacts_dir / FEATURES_FILE)))
    model = keras.models.load_model(model_path, compile=False)  # inference only

    n_cols = len(feature_columns)
    n_model = int(model.input_shape[-1])
    n_scaler = int(getattr(x_scaler, "n_features_in_", -1))
    if not (n_cols == n_model == n_scaler):
        raise ArtifactError(
            "Artifact mismatch: feature_columns has "
            f"{n_cols} columns, X_scaler expects {n_scaler}, model expects {n_model}."
        )
    scaler_names = getattr(x_scaler, "feature_names_in_", None)
    if scaler_names is not None and list(scaler_names) != feature_columns:
        raise ArtifactError("X_scaler was fitted on a different column order than feature_columns.")
    if int(getattr(y_scaler, "n_features_in_", 1)) != 1:
        raise ArtifactError("y_scaler must be fitted on a single target column.")
    if int(model.output_shape[-1]) != 1:
        raise ArtifactError(f"Expected a single-output model, got output shape {model.output_shape}.")

    log.info("Loaded model: input_dim=%s, columns=%s", n_model, n_cols)
    return ModelBundle(
        model=model,
        x_scaler=x_scaler,
        y_scaler=y_scaler,
        feature_columns=feature_columns,
        artifacts_dir=artifacts_dir,
        keras_file_version=_read_keras_file_version(model_path),
    )


def _read_json(path: Path) -> Optional[dict]:
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        log.warning("Ignoring %s: not valid JSON", path.name)
        return None


def describe_bundle(bundle: ModelBundle, output_currency: str) -> dict:
    """Payload for GET /model-info. Only reports what the artifacts contain."""
    layers = bundle.architecture()
    total = int(bundle.model.count_params())
    num_idx = {n: bundle.feature_columns.index(n) for n in ["carat", "depth", "table", "x", "y", "z"]}
    evaluation = _read_json(bundle.artifacts_dir / EVALUATION_FILE)
    return {
        "name": "Diamond price ANN",
        "framework": f"Keras {keras.__version__} (file saved with Keras {bundle.keras_file_version or 'unknown'})",
        "input_dim": bundle.input_dim,
        "output_dim": 1,
        "feature_columns": bundle.feature_columns,
        "categories": categories_from_columns(bundle.feature_columns),
        "architecture": layers,
        "total_params": total,
        "output_currency": output_currency,
        "target_scaler": {
            "mean": float(bundle.y_scaler.mean_[0]),
            "std": float(bundle.y_scaler.scale_[0]),
        },
        "training_ranges": {
            n: {
                "mean": float(bundle.x_scaler.mean_[i]),
                "std": float(bundle.x_scaler.scale_[i]),
            }
            for n, i in num_idx.items()
        },
        # Headline metrics exactly as reported by the model's author.
        "reported_metrics": _read_json(bundle.artifacts_dir / METRICS_FILE),
        # Present only if artifacts/evaluation.json exists; never synthesised.
        "evaluation": evaluation,
    }
