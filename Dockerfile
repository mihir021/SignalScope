# ==============================================================================
# Dockerfile for SignalScope API
# Single-stage deployment: pre-built frontend is copied directly to save EC2 memory
# Base Image: Official Python 3.11 Debian-slim
# ==============================================================================

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

COPY app /app/app
COPY model /app/model
COPY tests /app/tests

# Copy the pre-built React UI from the host repository (avoids heavy Node.js build on EC2)
COPY frontend/dist /app/frontend/dist

EXPOSE 8000

HEALTHCHECK --interval=20s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
