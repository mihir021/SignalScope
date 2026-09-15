# SignalScope - AI-Generated Image & Deepfake Forensic Detector 🔍

[![CI - PR Quality Gate & Conflict Check](https://github.com/your-org/signalscope/actions/workflows/ci.yml/badge.svg)](.github/workflows/ci.yml)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_18_+_Vite-61DAFB.svg?style=flat&logo=react)](https://vitejs.dev)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg?style=flat&logo=docker)](https://www.docker.com/)
[![Tests](https://img.shields.io/badge/Pytest-42%20Passed-brightgreen.svg)](tests/)

**SignalScope** is a dual-brain forensic intelligence platform engineered for **Smart India Hackathon (SIH 2026)** to detect synthetic media, AI-generated imagery, and deepfakes. It fuses semantic visual attention with hardware-level camera sensor physics to output calibrated, human-interpretable verdicts that eliminate false positives on modern smartphones (portrait bokeh, night mode, beauty filters).

---

## 🎥 Project Demo Video

Watch the full live demonstration of SignalScope explaining the forensic pipeline, dual-brain consensus, and dashboard:
🔗 **[Watch SignalScope Demo Video on Google Drive](https://drive.google.com/file/d/193WlmFlnJudfCSkK4fqJmsGhY91_bM2c/view?usp=sharing)**

---

## 🌟 Key Capabilities & PS-2 Compliance

1. **Dual-Brain Consensus Architecture**:
   - **Brain 1 (Visual Semantic AI):** CLIP ViT-B/16 transformer extracts semantic inconsistencies, warped geometries, and synthetic texture artifacts.
   - **Brain 2 (Camera Physics AI):** 2D Fast Fourier Transform (FFT) azimuthal power decay + Spatial Rich Model (SRM) sensor noise residual analysis.
   - **Consensus & Gating:** Autonomous smartphone portrait mode shield suppresses false alarms caused by computational photography.
2. **Official PS-2 Calibrated Verdicts**:
   - Categorized strictly as `Likely Authentic (REAL)` or `Likely AI-Generated (SYNTHETIC)`.
   - Clear certainty metrics: `HIGH CERTAINTY` vs `BORDERLINE`.
3. **Four-Panel Human Forensic Laboratory**:
   - **Heatmaps & Attention:** LayerCAM visual focus maps highlighting manipulative regions with interactive blend slider.
   - **Sensor & Frequency Analysis:** 2D-FFT azimuthal profiles checking for checkerboard upsampling artifacts, and Photo-Response Non-Uniformity (PRNU) sensor grain verification.
   - **Social Media Robustness:** Pre-validated resilience against WhatsApp compression ($Q=35$), Instagram resizing, mobile screenshots, and adversarial perturbations.
   - **Provenance & AI Attribution:** EXIF hardware provenance parsing and generator family classification (Midjourney, Stable Diffusion, DALL-E, StyleGAN).
4. **Natural Language Explanations**:
   - Real-time forensic diagnostic summary generated via the `/image/summary` engine for non-technical evaluators and court admissibility.

---

## 🏗️ Project Directory Structure

```
SignalScope/
├── .github/
│   └── workflows/
│       ├── ci.yml                 # PR quality gate: merge checks, flake8, pytest, docker & frontend build
│       └── deploy.yml             # Continuous deployment workflow
├── app/                           # FastAPI backend service
│   ├── __init__.py
│   ├── main.py                    # REST API endpoints (/, /predict, /predict/detailed, /image/summary, /metrics)
│   └── telemetry.py               # Prometheus metrics & latency telemetry
├── model/                         # ML core, inference & forensic engines
│   ├── __init__.py
│   ├── classifier.py              # Dual-stream forensic classifier (CLIP + SRM + 2D-FFT)
│   ├── explain.py                 # LayerCAM attention heatmap & cue generator
│   ├── frequency.py               # Azimuthal 2D-FFT power spectrum analysis
│   ├── sensor_noise.py            # SRM filtering & PRNU sensor grain extraction
│   ├── attribution.py             # Generator family attribution (Diffusion/GAN)
│   ├── region_captioner.py        # Hotspot extraction & zero-shot CLIP labelling
│   ├── metadata_extractor.py      # Camera EXIF & provenance parser
│   ├── defactify_dataset.py       # Balanced dataset pipeline
│   ├── temperature_scaling.py     # Platt temperature scaling calibrator
│   └── weights/                   # Trained model weights checkpoint
├── frontend/                      # Modern React 18 + Vite + Tailwind CSS dashboard
│   ├── index.html                 # Single-page app entry
│   ├── package.json               # Frontend dependencies
│   ├── vite.config.js             # Vite configuration & proxy
│   └── src/
│       ├── App.jsx                # Main application orchestrator
│       ├── index.css              # Bento design tokens, gradients & glassmorphism
│       ├── services/
│       │   └── api.js             # Axios client connecting to FastAPI backend
│       └── components/
│           ├── Header.jsx         # Sticky pill navbar with live backend status
│           ├── HeroUpload.jsx     # Drag-and-drop file upload zone with preview
│           ├── VerdictSummary.jsx # Official PS-2 verdict & latency banner
│           ├── DualBrainCharts.jsx# Neural breakdown bars & calibrated consensus
│           ├── ExplanationSummary.jsx # Natural language forensic breakdown
│           ├── ForensicTabs.jsx   # 4-tab forensic inspection laboratory
│           ├── ModelAttention.jsx # LayerCAM saliency heatmaps
│           ├── SpectralChart.jsx  # 2D-FFT power spectrum diagnostics
│           ├── SensorNoiseVisualizer.jsx # SRM sensor grain & PRNU noise view
│           ├── RobustnessCard.jsx # Social media compression & tamper retention
│           ├── MetadataCard.jsx   # EXIF camera & provenance extraction
│           ├── GeneratorAttribution.jsx # AI family classification
│           ├── DualStreamDiagram.jsx # Visual pipeline architecture diagram
│           └── Footer.jsx         # Hackathon attribution & system status
├── monitoring/                    # Observability & telemetry
│   ├── prometheus.yml             # Prometheus scrape configuration
│   └── grafana/                   # Pre-configured Grafana monitoring dashboards
├── tests/                         # Comprehensive automated test suite (42 tests)
│   ├── test_api.py                # Endpoint contract, validation & security tests
│   ├── test_attribution.py        # Generator head & explainability tests
│   ├── test_explainability.py     # LayerCAM & grounding cue tests
│   ├── test_image_summary.py      # Natural language summary tests
│   └── test_pipeline_integrity.py # Split disjointness, feature stability & tensor tests
├── Dockerfile                     # Multi-stage production container
├── docker-compose.yml             # Multi-container orchestration (App, Prometheus, Grafana)
├── requirements.txt               # Pinned Python dependencies
└── README.md                      # Project documentation
```

---

## 🚀 How to Run on ANY Computer

You can run SignalScope on **Windows, macOS, or Linux** using either **Native Setup** (recommended for local development) or **Docker Compose** (one-command setup).

### Option A: Native Setup (Python + Node.js)

#### 1. Prerequisites
- **Python 3.10, 3.11, or 3.12** installed ([python.org](https://www.python.org/downloads/))
- **Node.js 18 or 20** installed ([nodejs.org](https://nodejs.org/))
- **Git** installed

#### 2. Clone the Repository
```bash
git clone https://github.com/your-org/SignalScope.git
cd SignalScope
```

#### 3. Start the Backend API
Open a terminal in the project root:

```bash
# Windows (PowerShell):
python -m venv .venv
.venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# macOS / Linux (Bash):
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*Backend runs at `http://127.0.0.1:8000`. Swagger API docs available at `http://127.0.0.1:8000/docs`.*

#### 4. Start the Frontend Dashboard
Open a second terminal window:

```bash
cd frontend
npm install
npm run dev
```
*Frontend runs at `http://localhost:5173`. Open in your browser to start analyzing images!*

---

### Option B: One-Command Docker Compose

If you have Docker Desktop installed, spin up the complete stack with:

```bash
docker compose up -d --build
```

#### Verified Network Endpoints:
| Service | Local URL | Purpose |
| :--- | :--- | :--- |
| **Frontend UI** | [http://localhost:5173](http://localhost:5173) | Interactive Bento forensic analysis dashboard |
| **FastAPI Backend** | [http://localhost:8000](http://localhost:8000) | Core ML prediction & forensic engine |
| **Interactive Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive OpenAPI / Swagger interface |
| **Prometheus** | [http://localhost:9090](http://localhost:9090) | Time-series telemetry metrics engine |
| **Grafana** | [http://localhost:3000](http://localhost:3000) | Real-time monitoring & throughput dashboards |

---

## 🧪 Testing & CI Quality Gates

SignalScope enforces a strict CI quality gate covering syntax, type safety, test contracts, and frontend builds:

```bash
# 1. Run Python Linting (Flake8):
flake8 app model tests --count --select=E9,F63,F7,F82 --show-source --statistics

# 2. Run Automated Pytest Suite (42 tests):
pytest tests/ -v

# 3. Verify Frontend Production Build:
cd frontend && npm run build
```

---

## 📡 REST API Reference

- `POST /predict`: Fast binary inference (`label`, `confidence`, `probabilities`).
- `POST /predict/detailed`: Full dual-stream forensic report including LayerCAM heatmap, 2D-FFT frequencies, sensor noise analysis, EXIF metadata, and attribution.
- `POST /image/summary`: Natural language forensic explanation tailored for human evaluators.
- `GET /health`: Healthcheck endpoint for load balancers.
- `GET /metrics`: Prometheus scrape endpoint reporting latency histograms and request counters.

---

## 👥 Authors & Acknowledgments
Built with ❤️ for **Smart India Hackathon (SIH 2026)**.
Developed by Team SignalScope.
