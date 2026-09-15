"""
SignalScope - Image Summary Endpoint Tests
==========================================
Verifies POST /image/summary and POST /describe:
1. Returns HTTP 200 for valid image uploads.
2. Synthesizes a natural language summary of the whole image.
3. Identifies primary subject, scene context, and visual style.
4. Returns top detected concepts with confidence scores.
5. Rejects invalid or corrupt files with appropriate HTTP error codes.
"""

import io
from PIL import Image
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_image_summary_endpoint():
    # Create synthetic test image
    img = Image.new("RGB", (200, 200), color=(180, 130, 80))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    response = client.post(
        "/image/summary",
        files={"file": ("test.png", buf, "image/png")}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["filename"] == "test.png"
    assert "summary" in data
    assert isinstance(data["summary"], str)
    assert len(data["summary"]) > 10
    assert "primary_subject" in data
    assert "subject_confidence" in data
    assert isinstance(data["subject_confidence"], float)
    assert "scene_type" in data
    assert "detected_style" in data
    assert "top_detected_concepts" in data
    assert isinstance(data["top_detected_concepts"], list)
    assert len(data["top_detected_concepts"]) > 0


def test_describe_alias_endpoint():
    img = Image.new("RGB", (160, 160), color=(50, 120, 200))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    response = client.post(
        "/describe",
        files={"file": ("blue_test.png", buf, "image/png")}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "summary" in data
    assert "primary_subject" in data


def test_image_summary_rejects_non_image():
    fake_txt = io.BytesIO(b"not an image file")
    response = client.post(
        "/image/summary",
        files={"file": ("notes.txt", fake_txt, "text/plain")}
    )
    assert response.status_code == 400
