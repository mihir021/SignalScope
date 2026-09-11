# ==============================================================================
# Dockerfile for SignalScope API
# Multi-stage-ready production-lean container for FastAPI application
# Base Image: Official Python 3.11 Debian-slim for minimal attack surface and size
# ==============================================================================

FROM python:3.11-slim

# ------------------------------------------------------------------------------
# Environment Variables
# - PYTHONDONTWRITEBYTECODE: 1 prevents Python from writing .pyc files
# - PYTHONUNBUFFERED: 1 ensures real-time log streaming without buffer delays
# ------------------------------------------------------------------------------
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

# Set the working directory inside the container
WORKDIR /app

# ------------------------------------------------------------------------------
# System Dependencies
# Install curl for container HEALTHCHECK verification
# Clean apt caches afterwards to keep image size small
# ------------------------------------------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ------------------------------------------------------------------------------
# Dependency Installation Layer
# Copy requirements.txt separately to leverage Docker layer caching
# ------------------------------------------------------------------------------
COPY requirements.txt /app/requirements.txt

# Install pip dependencies with --no-cache-dir to minimize layer size
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ------------------------------------------------------------------------------
# Application Code Layer
# Copy the app package and model package into the container workdir
# ------------------------------------------------------------------------------
COPY app /app/app
COPY model /app/model
COPY tests /app/tests

# ------------------------------------------------------------------------------
# Network and Container Configuration
# Expose port 8000 for the Uvicorn ASGI server
# ------------------------------------------------------------------------------
EXPOSE 8000

# Container healthcheck testing the root / endpoint
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

# ------------------------------------------------------------------------------
# Entrypoint Execution
# Start FastAPI using Uvicorn on 0.0.0.0:8000
# ------------------------------------------------------------------------------
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
