import itertools

import numpy as np
import pytest

from preprocessing import PreprocessingError, build_feature_frame, categories_from_columns, range_warnings
from prediction import predict_model_units

CUTS = ["Fair", "Good", "Very Good", "Premium", "Ideal"]
COLORS = list("DEFGHIJ")
CLARITIES = ["I1", "SI2", "SI1", "VS2", "VS1", "VVS2", "VVS1", "IF"]


def test_artifacts_are_consistent(bundle):
    assert len(bundle.feature_columns) == 26
    assert bundle.input_dim == 26 == bundle.x_scaler.n_features_in_
    assert bundle.y_scaler.n_features_in_ == 1
    assert bundle.model.output_shape[-1] == 1


def test_categories_match_ui_dropdowns(bundle):
    levels = categories_from_columns(bundle.feature_columns)
    assert sorted(levels["cut"]) == sorted(CUTS)
    assert sorted(levels["color"]) == sorted(COLORS)
    assert sorted(levels["clarity"]) == sorted(CLARITIES)


def test_frame_shape_order_and_onehot(bundle, sample):
    df = build_feature_frame(sample, bundle.feature_columns)
    assert df.shape == (1, 26)
    assert list(df.columns) == bundle.feature_columns
    row = df.iloc[0]
    assert row["carat"] == 1.0 and row["z"] == 3.95
    assert {c for c in bundle.feature_columns if row[c] == 1 and "_" in c} == {"cut_Ideal", "color_G", "clarity_VS2"}


@pytest.mark.parametrize("cut,color,clarity", list(itertools.product(CUTS, COLORS, CLARITIES)))
def test_every_category_combo_encodes_to_exactly_three_ones(bundle, sample, cut, color, clarity):
    df = build_feature_frame({**sample, "cut": cut, "color": color, "clarity": clarity}, bundle.feature_columns)
    dummies = [c for c in bundle.feature_columns if "_" in c]
    assert df[dummies].sum(axis=1).iloc[0] == 3
    assert df.shape == (1, 26)


def test_unknown_category_is_rejected(bundle, sample):
    with pytest.raises(PreprocessingError):
        build_feature_frame({**sample, "cut": "Superb"}, bundle.feature_columns)


def test_missing_field_is_rejected(bundle, sample):
    sample.pop("carat")
    with pytest.raises(PreprocessingError):
        build_feature_frame(sample, bundle.feature_columns)


def test_pipeline_matches_independent_manual_computation(bundle, sample):
    """Re-derive the result by hand from raw scaler stats to prove the inverse transform."""
    df = build_feature_frame(sample, bundle.feature_columns)
    manual_x = (df.to_numpy() - bundle.x_scaler.mean_) / bundle.x_scaler.scale_
    raw_out = np.asarray(bundle.model(manual_x.astype("float32"), training=False))[0, 0]
    manual_price = raw_out * bundle.y_scaler.scale_[0] + bundle.y_scaler.mean_[0]
    assert predict_model_units(bundle, sample) == pytest.approx(float(manual_price), rel=1e-5)


def test_prediction_is_finite_positive_and_deterministic(bundle, sample):
    a, b = predict_model_units(bundle, sample), predict_model_units(bundle, sample)
    assert np.isfinite(a) and a > 0
    assert a == b  # dropout must be off at inference


def test_price_increases_with_size_for_otherwise_similar_stones(bundle, sample):
    def stone(carat, xyz, z):
        return predict_model_units(bundle, {**sample, "carat": carat, "x": xyz, "y": xyz, "z": z})
    small, mid, large = stone(0.5, 5.1, 3.15), stone(1.0, 6.4, 3.95), stone(2.0, 8.1, 5.0)
    assert small < mid < large


def test_warnings_for_extreme_and_inconsistent_inputs(bundle, sample):
    clean = range_warnings(sample, bundle.feature_columns, bundle.x_scaler.mean_, bundle.x_scaler.scale_)
    assert clean == []
    odd = {**sample, "carat": 5.9, "z": 7.5}
    msgs = range_warnings(odd, bundle.feature_columns, bundle.x_scaler.mean_, bundle.x_scaler.scale_)
    assert any("carat" in m for m in msgs) and any("Depth %" in m for m in msgs)
