"""
SignalScope - AI-Generated Image Detector (FastAPI Backend)
============================================================
This module implements the core API service for SignalScope:
- Health check route (GET /)
- Model prediction placeholder route (POST /predict)
- Automated Prometheus metric exposition (GET /metrics)

Designed for SIH 2026 AI-Generated Image Detection.
"""

from typing import Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, status, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator
from PIL import Image
import io
import logging

from model.predict import classifier

# ------------------------------------------------------------------------------
# Logging Configuration
# ------------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("signalscope-api")

# ------------------------------------------------------------------------------
# FastAPI Application Initialization
# ------------------------------------------------------------------------------
app = FastAPI(
    title="SignalScope API",
    description="Deepfake and AI-Generated Image Classification Service (SIH 2026)",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# ------------------------------------------------------------------------------
# CORS Middleware Configuration
# Allows cross-origin requests from web frontends or external consumers
# ------------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------------------
# Prometheus Instrumentation
# Automatically monitors request latency, throughput, HTTP status codes,
# and exposes them at the /metrics endpoint for Prometheus scraping.
# ------------------------------------------------------------------------------
Instrumentator().instrument(app).expose(app, endpoint="/metrics")


# ------------------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------------------

@app.get("/", summary="Health Check", tags=["Health"])
async def health_check():
    """
    Health check endpoint for container orchestrators, Docker healthchecks,
    and monitoring agents to verify the API is alive and responsive.
    """
    logger.info("Health check endpoint invoked.")
    return {
        "status": "healthy",
        "service": "SignalScope API",
        "version": "1.0.0"
    }


@app.post("/predict", summary="Predict Real vs Fake Image", tags=["Inference"])
async def predict(file: UploadFile = File(...), caption: Optional[str] = Form(None)):
    """
    Image inference endpoint:
    - Accepts an uploaded image (JPEG, PNG, WebP, etc.)
    - Validates image integrity using Pillow (PIL)
    - Returns classification result: label ('real' or 'fake') and confidence score.
    - Optional caption parameter evaluates multimodal caption consistency (Bonus Track E).
    """
    # Verify that an uploaded file exists and has an image content type
    if not file.content_type or not file.content_type.startswith("image/"):
        logger.warning(f"Rejected non-image upload with content-type: {file.content_type}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Expected an image, but received: {file.content_type}"
        )

    # Step 1: Read and validate that the byte stream is a readable image using Pillow
    try:
        image_bytes = await file.read()
        with Image.open(io.BytesIO(image_bytes)) as img:
            img.verify()
            detected_format = img.format

        logger.info(
            f"Received valid image '{file.filename}' "
            f"(Format: {detected_format}, Size: {len(image_bytes)} bytes)"
        )
    except Exception as exc:
        logger.warning(f"Rejected unprocessable image '{file.filename}': {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Corrupt or unsupported image file: {str(exc)}"
        )

    # Step 2: Model Inference via Dual-Stream Classifier
    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            pil_image = img.convert("RGB")
            prediction = classifier.predict(pil_image, caption=caption)

        result = {
            "filename": file.filename,
            "label": prediction["label"],
            "verdict": prediction["verdict"],
            "confidence": prediction["confidence"],
            "probabilities": prediction["probabilities"],
            "status": "success",
        }
        if "attribution" in prediction and prediction["attribution"] is not None:
            result["attribution"] = prediction["attribution"]
        if "exif_metadata" in prediction:
            result["exif_metadata"] = prediction["exif_metadata"]
        if "multimodal_match" in prediction:
            result["multimodal_match"] = prediction["multimodal_match"]

        return JSONResponse(status_code=status.HTTP_200_OK, content=result)

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Inference failure for '{file.filename}': {str(exc)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal inference error: {str(exc)}"
        )


@app.post("/predict/detailed", summary="Predict with Explainability & Spatial Heatmap (Bonus Track A)", tags=["Inference"])
async def predict_detailed_endpoint(
    file: UploadFile = File(...),
    caption: Optional[str] = Form(None),
    include_overlay: bool = Query(False),
):
    """
    Detailed image inference endpoint (Bonus Track A - Faithful Explanation):
    - Validates image integrity
    - Runs dual-stream classification
    - Generates ViT attention saliency heatmap overlay (base64)
    - Synthesizes grounded natural-language forensic cues (spatial, FFT, noise PRNU)
    - Predicts generator family attribution (Bonus Track B)
    - Extracts camera hardware provenance (Bonus Track D)
    - Validates multimodal caption consistency if provided (Bonus Track E)
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        logger.warning(f"Rejected non-image upload with content-type: {file.content_type}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Expected an image, but received: {file.content_type}"
        )

    # Step 1: Read and validate image
    try:
        image_bytes = await file.read()
        with Image.open(io.BytesIO(image_bytes)) as img:
            img.verify()
            detected_format = img.format

        logger.info(
            f"Detailed analysis request for '{file.filename}' "
            f"(Format: {detected_format}, Size: {len(image_bytes)} bytes)"
        )
    except Exception as exc:
        logger.warning(f"Rejected unprocessable image '{file.filename}': {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Corrupt or unsupported image file: {str(exc)}"
        )

    # Step 2: Detailed Inference with Explainability
    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            pil_image = img.convert("RGB")
            prediction = classifier.predict_detailed(pil_image, caption=caption)

        result = {
            "filename": file.filename,
            "label": prediction["label"],
            "verdict": prediction["verdict"],
            "confidence": prediction["confidence"],
            "probabilities": prediction["probabilities"],
            "explanation_cues": prediction["explanation_cues"],
            "explanation_summary": prediction["explanation_summary"],
            "status": "success",
        }
        if include_overlay:
            result["overlay_base64"] = prediction["overlay_base64"]
        if "attribution" in prediction and prediction["attribution"] is not None:
            result["attribution"] = prediction["attribution"]
        if "exif_metadata" in prediction:
            result["exif_metadata"] = prediction["exif_metadata"]
        if "multimodal_match" in prediction:
            result["multimodal_match"] = prediction["multimodal_match"]

        return JSONResponse(status_code=status.HTTP_200_OK, content=result)

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Detailed inference failure for '{file.filename}': {str(exc)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal inference error: {str(exc)}"
        )

