"""
SignalScope - AI-Generated Image Detector (FastAPI Backend)
============================================================
This module implements the core API service for SignalScope:
- Health check route (GET /)
- Model prediction placeholder route (POST /predict)
- Automated Prometheus metric exposition (GET /metrics)

Designed for SIH 2026 AI-Generated Image Detection.
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, status
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
async def predict(file: UploadFile = File(...)):
    """
    Image inference endpoint:
    - Accepts an uploaded image (JPEG, PNG, WebP, etc.)
    - Validates image integrity using Pillow (PIL)
    - Returns classification result: label ('real' or 'fake') and confidence score.
    """
    # Verify that an uploaded file exists and has an image content type
    if not file.content_type or not file.content_type.startswith("image/"):
        logger.warning(f"Rejected non-image upload with content-type: {file.content_type}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Expected an image, but received: {file.content_type}"
        )

    try:
        # Read the raw byte content of the uploaded image
        image_bytes = await file.read()

        # Validate that the byte stream is a readable image using Pillow
        with Image.open(io.BytesIO(image_bytes)) as img:
            img.verify()
            detected_format = img.format

        logger.info(
            f"Received valid image '{file.filename}' "
            f"(Format: {detected_format}, Size: {len(image_bytes)} bytes)"
        )

        # ----------------------------------------------------------------------
        # Model Inference via Dual-Stream Classifier
        # ----------------------------------------------------------------------
        with Image.open(io.BytesIO(image_bytes)) as img:
            pil_image = img.convert("RGB")
            prediction = classifier.predict(pil_image)

        result = {
            "filename": file.filename,
            "label": prediction["label"],
            "verdict": prediction["verdict"],
            "confidence": prediction["confidence"],
            "probabilities": prediction["probabilities"],
            "status": "success",
        }

        return JSONResponse(status_code=status.HTTP_200_OK, content=result)

    except Exception as exc:
        logger.error(f"Failed to process image '{file.filename}': {str(exc)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Corrupt or unsupported image file: {str(exc)}"
        )
