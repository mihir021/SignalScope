"""
SignalScope - Explainability & Saliency Unit Tests
===================================================
Verifies the ExplainabilityPipeline (Bonus Track A - Headline Bonus):
1. ViTSaliencyExplainer produces properly normalized (H, W) heatmaps in [0, 1].
2. Overlay generation blends properly without NaN or invalid channels.
3. GroundedExplanationEngine synthesizes structured, ethical cues conforming to Section 4.3.
4. Explanations do not contain accusatory or profiling language.
"""

import numpy as np
import pytest
from PIL import Image

from model.predict import classifier
from model.explain import ViTSaliencyExplainer, GroundedExplanationEngine, ExplainabilityPipeline


def test_vit_saliency_explainer_shape_and_range():
    explainer = ViTSaliencyExplainer(classifier)
    test_img = Image.new("RGB", (256, 192), color=(120, 80, 40))

    heatmap, (w, h) = explainer.compute_saliency_map(test_img)

    assert w == 256
    assert h == 192
    assert heatmap.shape == (192, 256)
    assert 0.0 <= heatmap.min()
    assert heatmap.max() <= 1.0
    assert not np.isnan(heatmap).any()


def test_heatmap_overlay_generation():
    explainer = ViTSaliencyExplainer(classifier)
    test_img = Image.new("RGB", (128, 128), color=(200, 150, 100))
    heatmap = np.random.uniform(0.0, 1.0, (128, 128)).astype(np.float32)

    overlay = explainer.generate_heatmap_overlay(test_img, heatmap, colormap_name="plasma")

    assert isinstance(overlay, Image.Image)
    assert overlay.size == (128, 128)
    assert overlay.mode == "RGB"


def test_grounded_explanation_cues_structure():
    engine = GroundedExplanationEngine()
    test_img = Image.new("RGB", (100, 100), color=(50, 50, 50))
    heatmap = np.zeros((100, 100), dtype=np.float32)
    heatmap[20:40, 20:40] = 0.9  # Simulated hotspot

    fake_pred = {"label": "fake", "verdict": "likely AI-generated", "confidence": 0.95}
    cues_fake = engine.generate_cues(test_img, fake_pred, heatmap)

    assert cues_fake["is_faithful"] is True
    assert "spatial_cue" in cues_fake
    assert "frequency_cue" in cues_fake
    assert "noise_cue" in cues_fake
    assert "summary" in cues_fake
    assert "hotspot_region" in cues_fake
    assert "likely AI-generated" in cues_fake["summary"]

    # Verify ethical language: no accusatory framing
    forbidden_terms = ["deepfake criminal", "fake person", "guaranteed fraud", "fake human"]
    for term in forbidden_terms:
        assert term not in cues_fake["summary"].lower()

    real_pred = {"label": "real", "verdict": "likely authentic / real", "confidence": 0.98}
    cues_real = engine.generate_cues(test_img, real_pred, heatmap)
    assert "likely authentic" in cues_real["summary"]


def test_full_explainability_pipeline():
    pipeline = ExplainabilityPipeline(classifier)
    test_img = Image.new("RGB", (112, 112), color=(75, 125, 175))

    result = pipeline.explain(test_img)

    assert "prediction" in result
    assert "explanation_cues" in result
    assert "overlay_base64" in result
    assert len(result["overlay_base64"]) > 100
    assert result["heatmap_shape"] == [112, 112]
