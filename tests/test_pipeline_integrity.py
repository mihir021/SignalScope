"""
SignalScope - Pipeline Integrity Tests
========================================
Fast, offline sanity tests. No GPU, no downloaded dataset, no trained
weights strictly required (GPU/CLIP-dependent tests auto-skip if the
environment can't support them, rather than failing).

Run this before every training job and before every commit:
    pytest tests/test_pipeline_integrity.py -v

What this catches:
  - The val/test leakage bug coming back after a future refactor
  - Forensic feature extractor producing NaN/Inf or being non-deterministic
  - The CLIP backbone accidentally becoming trainable
  - predict() silently breaking its documented interface contract
"""

import os
import sys
import numpy as np
import torch
import pytest
from PIL import Image

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from model.splits import get_disjoint_val_test_indices, assert_disjoint
from model.forensic import ForensicExtractor


# ---------------------------------------------------------------------------
# 1. Data split integrity - regresses the val/test leakage bug specifically
# ---------------------------------------------------------------------------

def test_val_test_splits_never_overlap():
    val_idx, test_idx = get_disjoint_val_test_indices(
        total_size=20000, val_size=2000, test_size=2000, seed=42
    )
    assert len(set(val_idx.tolist()) & set(test_idx.tolist())) == 0, \
        "Validation and test indices overlap - this is the leakage bug"
    assert len(val_idx) == 2000
    assert len(test_idx) == 2000


def test_assert_disjoint_raises_on_overlap():
    a = np.array([1, 2, 3])
    b = np.array([3, 4, 5])
    with pytest.raises(RuntimeError):
        assert_disjoint(a, b)


def test_assert_disjoint_passes_on_clean_split():
    a = np.array([1, 2, 3])
    b = np.array([4, 5, 6])
    assert_disjoint(a, b)  # should not raise


def test_split_raises_when_pool_too_small():
    with pytest.raises(ValueError):
        get_disjoint_val_test_indices(total_size=1000, val_size=800, test_size=800)


def test_split_is_reproducible_across_runs():
    v1, t1 = get_disjoint_val_test_indices(20000, 2000, 2000, seed=42)
    v2, t2 = get_disjoint_val_test_indices(20000, 2000, 2000, seed=42)
    assert np.array_equal(v1, v2) and np.array_equal(t1, t2), \
        "Splits must be reproducible so train.py and evaluate.py agree"


def test_different_seeds_give_different_splits():
    v1, _ = get_disjoint_val_test_indices(20000, 2000, 2000, seed=42)
    v2, _ = get_disjoint_val_test_indices(20000, 2000, 2000, seed=7)
    assert not np.array_equal(v1, v2)


# ---------------------------------------------------------------------------
# 2. Forensic feature extractor sanity
# ---------------------------------------------------------------------------

def _random_image(size=(224, 224)):
    arr = (np.random.rand(*size, 3) * 255).astype(np.uint8)
    return Image.fromarray(arr)


def test_forensic_feature_shape_and_dtype():
    extractor = ForensicExtractor()
    feats = extractor.extract_from_pil(_random_image())
    assert feats.shape == (128,)
    assert feats.dtype == np.float32


def test_forensic_features_have_no_nan_or_inf():
    extractor = ForensicExtractor()
    for _ in range(5):
        feats = extractor.extract_from_pil(_random_image())
        assert np.isfinite(feats).all(), "Forensic features contain NaN/Inf"


def test_forensic_features_deterministic_on_same_image():
    extractor = ForensicExtractor()
    img = _random_image()
    f1 = extractor.extract_from_pil(img)
    f2 = extractor.extract_from_pil(img)
    np.testing.assert_array_equal(f1, f2)


def test_forensic_features_on_solid_color_image_dont_crash():
    # Zero-variance image is a classic div-by-zero trigger (std=0 in skew/kurtosis,
    # or in the FFT radial profile normalization). Must degrade gracefully to zeros,
    # not NaN.
    extractor = ForensicExtractor()
    solid = Image.new("RGB", (224, 224), (128, 128, 128))
    feats = extractor.extract_from_pil(solid)
    assert np.isfinite(feats).all()


def test_forensic_features_differ_between_noise_and_solid_image():
    # Sanity: the extractor should not collapse everything to the same vector
    extractor = ForensicExtractor()
    solid = Image.new("RGB", (224, 224), (128, 128, 128))
    noisy = _random_image()
    f_solid = extractor.extract_from_pil(solid)
    f_noisy = extractor.extract_from_pil(noisy)
    assert not np.allclose(f_solid, f_noisy), \
        "Forensic extractor produced identical features for very different images"


# ---------------------------------------------------------------------------
# 3. Classifier forward pass sanity (skips cleanly if CLIP isn't downloadable
#    in this environment, e.g. no internet in a locked-down CI runner)
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def classifier():
    try:
        from model.classifier import DualStreamClassifier
    except ImportError:
        pytest.skip("torch/transformers not available in this environment")
    try:
        model = DualStreamClassifier(freeze_backbone=True)
    except OSError:
        pytest.skip("CLIP weights not downloaded/cached in this environment")
    model.eval()
    return model


def test_classifier_output_shape(classifier):
    pixel_values = torch.randn(2, 3, 224, 224)
    forensic = torch.randn(2, 128)
    with torch.no_grad():
        logits = classifier(pixel_values, forensic)
    assert logits.shape == (2, 2)


def test_classifier_probabilities_sum_to_one(classifier):
    pixel_values = torch.randn(2, 3, 224, 224)
    forensic = torch.randn(2, 128)
    with torch.no_grad():
        probs = classifier.predict_probabilities(pixel_values, forensic)
    sums = probs.sum(dim=-1)
    assert torch.allclose(sums, torch.ones_like(sums), atol=1e-4)


def test_backbone_is_actually_frozen(classifier):
    backbone_params = [p for n, p in classifier.named_parameters() if "vision_encoder" in n]
    assert len(backbone_params) > 0, "Could not find vision_encoder parameters to check"
    assert all(not p.requires_grad for p in backbone_params), \
        "CLIP backbone has trainable parameters despite freeze_backbone=True"


def test_head_and_forensic_proj_are_trainable(classifier):
    trainable_names = [n for n, p in classifier.named_parameters() if p.requires_grad]
    assert any("classifier_head" in n for n in trainable_names), \
        "classifier_head has no trainable parameters - training would do nothing"
    assert any("forensic_proj" in n for n in trainable_names), \
        "forensic_proj has no trainable parameters - forensic stream is dead weight"


def test_temperature_scaler_never_produces_nan_or_zero_division():
    from model.classifier import TemperatureScaler
    scaler = TemperatureScaler()
    scaler.temperature.data.fill_(-5.0)  # simulate a bad optimizer step
    logits = torch.randn(4, 2)
    scaled = scaler(logits)
    assert torch.isfinite(scaled).all(), "Temperature scaling produced NaN/Inf"


# ---------------------------------------------------------------------------
# 4. predict() interface contract (SIH-required contract: predict(image_path))
# ---------------------------------------------------------------------------

def test_predict_interface_contract():
    try:
        from model.predict import predict
    except Exception as e:
        pytest.skip(f"predict.py could not be imported in this environment: {e}")

    result = predict(_random_image())

    assert set(result.keys()) >= {"label", "confidence", "probabilities"}
    assert result["label"] in {"real", "fake"}
    assert 0.0 <= result["confidence"] <= 1.0
    assert abs(
        result["probabilities"]["real"] + result["probabilities"]["fake"] - 1.0
    ) < 1e-3, "Probabilities do not sum to 1"


def test_predict_accepts_file_path(tmp_path):
    try:
        from model.predict import predict
    except Exception as e:
        pytest.skip(f"predict.py could not be imported in this environment: {e}")

    img_path = tmp_path / "test_image.png"
    _random_image().save(img_path)
    result = predict(str(img_path))
    assert result["label"] in {"real", "fake"}


# ---------------------------------------------------------------------------
# 5. Defactify dataset pipeline contract
# ---------------------------------------------------------------------------

def test_defactify_dataset_contract():
    from model.dataset import DefactifyDataset
    # Mock items matching Defactify schema
    mock_data = [
        {"Image": _random_image(), "Label_A": 0, "Label_B": 0},
        {"Image": _random_image(), "Label_A": 1, "Label_B": 3},
    ]
    ds = DefactifyDataset(mock_data, is_train=True)
    assert len(ds) == 2

    item0 = ds[0]
    assert item0["pixel_values"].shape == (3, 224, 224)
    assert item0["forensic_features"].shape == (128,)
    assert item0["label"].item() == 0
    assert item0["generator_label"].item() == 0

    item1 = ds[1]
    assert item1["label"].item() == 1
    assert item1["generator_label"].item() == 3


def test_balanced_defactify_indices():
    from model.dataset import create_balanced_defactify_indices
    # Mock split with 6 classes (0=Real, 1..5=Generators)
    mock_split = {
        "Label_B": [0] * 20 + [1] * 10 + [2] * 10 + [3] * 10 + [4] * 10 + [5] * 10
    }
    indices = create_balanced_defactify_indices(mock_split, samples_per_generator=4, seed=42)
    # 4 per synthetic generator (5 * 4 = 20) + 20 real = 40 total
    assert len(indices) == 40
    selected_labels = [mock_split["Label_B"][i] for i in indices]
    reals = [l for l in selected_labels if l == 0]
    fakes = [l for l in selected_labels if l != 0]
    assert len(reals) == len(fakes) == 20


def test_balanced_indices_handles_dynamic_generator_counts():
    from model.dataset import create_balanced_defactify_indices
    # Mock split with only 2 synthetic generators (IDs 1 and 4)
    mock_split = {
        "Label_B": [0] * 30 + [1] * 15 + [4] * 15
    }
    indices = create_balanced_defactify_indices(mock_split, samples_per_generator=5, seed=123)
    # 2 generators * 5 = 10 fake + 10 real = 20 total
    assert len(indices) == 20
    selected_labels = [mock_split["Label_B"][i] for i in indices]
    assert sum(1 for l in selected_labels if l == 0) == 10
    assert sum(1 for l in selected_labels if l != 0) == 10


def test_local_folder_dataset_handles_recursion_and_aliases(tmp_path):
    from model.dataset import LocalFolderDataset
    # Create directory with alias names and nested subdirectories
    real_dir = tmp_path / "authentic"
    fake_sub_dir = tmp_path / "synthetic" / "dalle3_samples"
    real_dir.mkdir(parents=True)
    fake_sub_dir.mkdir(parents=True)

    _random_image().save(real_dir / "real_1.png")
    _random_image().save(real_dir / "real_2.jpg")
    _random_image().save(fake_sub_dir / "fake_nested.png")

    ds = LocalFolderDataset(str(tmp_path), extract_forensic=False)
    assert len(ds) == 3
    # Check that labels are assigned correctly (0 for authentic, 1 for synthetic)
    sample_labels = {sample["path"]: sample["label"].item() for sample in ds}
    assert any("real_1.png" in p and l == 0 for p, l in sample_labels.items())
    assert any("fake_nested.png" in p and l == 1 for p, l in sample_labels.items())

