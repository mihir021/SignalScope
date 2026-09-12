"""
SignalScope Automated Test Suite
=================================
Automated unit and integration tests executing in CI pipelines and local environments.
Tests cover:
- Health check availability (GET /)
- Prometheus metrics telemetry (GET /metrics)
- Image classification endpoint (POST /predict) with valid, invalid, and corrupt payloads
- Direct model interface inference testing (model.predict.classifier)
"""

import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app
from model.predict import ImageClassifier, classifier

# Initialize FastAPI TestClient
client = TestClient(app)


def create_test_image_bytes(format_name: str = "JPEG", size=(64, 64), color=(50, 100, 150)) -> bytes:
    """
    Helper function to generate an in-memory test image in byte format.
    """
    img = Image.new("RGB", size, color=color)
    buffer = io.BytesIO()
    img.save(buffer, format=format_name)
    buffer.seek(0)
    return buffer.getvalue()


# ------------------------------------------------------------------------------
# 1. API Route Tests
# ------------------------------------------------------------------------------

def test_health_check_endpoint():
    """
    Verifies that GET / returns HTTP 200 OK and confirms service health status.
    """
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "SignalScope API"
    assert "version" in data


def test_metrics_endpoint():
    """
    Verifies that GET /metrics returns HTTP 200 and standard Prometheus telemetry strings.
    """
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "python_gc" in response.text or "http" in response.text


def test_predict_endpoint_valid_jpeg():
    """
    Verifies that POST /predict accepts a valid JPEG image and returns prediction JSON
    containing label ('real' or 'fake') and a confidence score.
    """
    image_bytes = create_test_image_bytes("JPEG")
    files = {"file": ("test_sample.jpg", image_bytes, "image/jpeg")}

    response = client.post("/predict", files=files)
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "success"
    assert data["filename"] == "test_sample.jpg"
    assert data["label"] in ["real", "fake"]
    assert 0.0 <= data["confidence"] <= 1.0


def test_predict_endpoint_valid_png():
    """
    Verifies that POST /predict accepts a valid PNG image format.
    """
    image_bytes = create_test_image_bytes("PNG")
    files = {"file": ("test_sample.png", image_bytes, "image/png")}

    response = client.post("/predict", files=files)
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "success"
    assert data["filename"] == "test_sample.png"


def test_predict_endpoint_rejects_non_image():
    """
    Verifies that POST /predict rejects non-image files (e.g. text/plain) with HTTP 400.
    """
    files = {"file": ("notes.txt", b"This is plain text, not an image.", "text/plain")}

    response = client.post("/predict", files=files)
    assert response.status_code == 400
    assert "Invalid file type" in response.json()["detail"]


def test_predict_endpoint_rejects_corrupted_image():
    """
    Verifies that POST /predict handles corrupted image streams with HTTP 422 Unprocessable Entity.
    """
    # Send random invalid byte data claiming to be image/jpeg
    files = {"file": ("corrupt.jpg", b"\x00\x01\x02CorruptGarbageDataHere", "image/jpeg")}

    response = client.post("/predict", files=files)
    assert response.status_code == 422
    assert "Corrupt or unsupported image file" in response.json()["detail"]


# ------------------------------------------------------------------------------
# 2. Direct Model Unit Tests
# ------------------------------------------------------------------------------

def test_classifier_predict_direct():
    """
    Verifies the ImageClassifier class directly using a PIL Image object.
    """
    test_classifier = ImageClassifier()
    assert test_classifier.is_loaded is True

    test_img = Image.new("RGB", (100, 100), color=(255, 0, 0))
    result = test_classifier.predict(test_img)

    assert "label" in result
    assert result["label"] in ["real", "fake"]
    assert "confidence" in result
    assert isinstance(result["confidence"], (int, float))


def test_predict_detailed_endpoint():
    """
    Verifies that POST /predict/detailed returns explainability cues and heatmap base64.
    """
    image_bytes = create_test_image_bytes("JPEG", size=(128, 128))
    files = {"file": ("test_explain.jpg", image_bytes, "image/jpeg")}

    response = client.post("/predict/detailed", files=files)
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "success"
    assert "explanation_cues" in data
    assert "explanation_summary" in data
    assert "overlay_base64" in data
    assert len(data["overlay_base64"]) > 100
    assert "hotspot_region" in data["explanation_cues"]

