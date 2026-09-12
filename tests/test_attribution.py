"""
SignalScope - Generator Family Attribution Unit Tests
======================================================
Verifies the Generator Family Attribution Head (Bonus Track B):
1. GeneratorAttributionHead architecture produces valid 4-class logits from 640-d input.
2. Softmax probabilities sum to 1.0.
3. GeneratorAttributionPredictor produces well-formed attribution dictionary.
4. Attribution output adheres to the official generator families list.
"""

import numpy as np
import pytest
import torch
from PIL import Image

from model.attribution import (
    GeneratorAttributionHead,
    GeneratorAttributionPredictor,
    GENERATOR_FAMILIES
)
from model.predict import classifier, predict, predict_detailed


def test_attribution_head_forward():
    head = GeneratorAttributionHead(in_features=640, num_families=4)
    head.eval()

    dummy_input = torch.randn(4, 640)
    with torch.no_grad():
        logits = head(dummy_input)

    assert logits.shape == (4, 4)
    probs = torch.softmax(logits, dim=-1)
    sums = probs.sum(dim=-1).numpy()
    np.testing.assert_allclose(sums, np.ones(4), atol=1e-5)


def test_attribution_predictor_output_structure():
    predictor = GeneratorAttributionPredictor(classifier)
    test_img = Image.new("RGB", (128, 128), color=(140, 90, 60))

    attr = predictor.predict_family(test_img)

    assert isinstance(attr, dict)
    assert "predicted_family" in attr
    assert "confidence" in attr
    assert "family_probabilities" in attr

    assert attr["predicted_family"] in GENERATOR_FAMILIES
    assert 0.0 <= attr["confidence"] <= 1.0

    prob_dict = attr["family_probabilities"]
    assert len(prob_dict) == len(GENERATOR_FAMILIES)
    total_prob = sum(prob_dict.values())
    np.testing.assert_allclose(total_prob, 1.0, atol=1e-3)


def test_predict_detailed_includes_explainability_and_cues():
    test_img = Image.new("RGB", (112, 112), color=(100, 150, 200))
    res = predict_detailed(test_img)

    assert "label" in res
    assert "verdict" in res
    assert "confidence" in res
    assert "probabilities" in res
    assert "explanation_cues" in res
    assert "explanation_summary" in res
    assert "overlay_base64" in res
    assert "diagnostics" in res
    assert "visual_norm" in res["diagnostics"]
    assert "forensic_norm" in res["diagnostics"]
