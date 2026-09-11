# SignalScope - DevOps Infrastructure & Deployment Guide

> **Project:** SignalScope — AI-Generated Image Detector (Real vs Fake Classifier)  
> **Event:** Smart India Hackathon (SIH 2026)  
> **Target Environment:** AWS EC2 (`Ubuntu 26.04 LTS`, `m7i-flex.large`, `us-east-1`)  
> **Repository:** [https://github.com/mihir021/SignalScope](https://github.com/mihir021/SignalScope)

---

## 1. Overview of Work Completed

We established an enterprise-grade, production-lean DevOps infrastructure for **SignalScope**, complete with local multi-container orchestration, continuous delivery to AWS EC2, automated telemetry, and zero-downtime deployment pipelines.

```mermaid
flowchart TD
    subgraph Developer["Local Machine"]
        Dev[Local Code] -->|git commit| LocalGit[Local Git (main)]
        LocalGit -->|git push| GH[GitHub Repository]
    end

    subgraph CI_CD["GitHub Actions CI/CD"]
        GH -->|Push Trigger| GHA[Runner]
        GHA -->|Build & Test| DockerBuild[Docker Image Build]
        DockerBuild -->|appleboy/ssh-action| SSH[SSH into EC2]
    end

    subgraph AWS_EC2["AWS EC2 (18.212.83.78)"]
        SSH --> Pull[git pull / clone via Deploy Key]
        Pull --> Compose[docker compose up -d --build]
        Compose --> App[FastAPI Backend :8000]
        Compose --> Prom[Prometheus :9090]
        Compose --> Graf[Grafana Dashboard :3000]
        Prom -->|Scrapes /metrics| App
        Graf -->|Visualizes| Prom
    end
```

---

## 2. Infrastructure & File Structure

```
SignalScope/
├── app/
│   ├── __init__.py
│   └── main.py                     # FastAPI app with /, /predict, and /metrics
├── model/
│   ├── __init__.py
│   ├── predict.py                  # ML model inference wrapper
│   └── README.md                   # Model training & weights guide
├── report/
│   └── README.md                   # One-page evaluation report placeholder
├── monitoring/
│   └── prometheus.yml              # Prometheus scrape configuration (15s interval)
├── .github/
│   └── workflows/
│       └── deploy.yml              # CI/CD pipeline (Docker build + EC2 SSH deployment)
├── .gitignore                      # Git ignore rules (Python, Docker, envs, keys)
├── Dockerfile                      # Production-lean Python 3.11-slim container
├── docker-compose.yml              # Multi-container orchestration (App, Prometheus, Grafana)
├── requirements.txt                # Pinned dependencies with documentation
├── README.md                       # High-level project documentation
└── DEVOPS_SETUP.md                 # Detailed operational and deployment manual
```

---

## 3. Server Specifications & Configuration

| Parameter | Configuration |
| :--- | :--- |
| **Cloud Provider** | Amazon Web Services (AWS) |
| **Instance ID** | `i-0a6cb876b0a0b3c07` |
| **Instance Name** | `SignalScope-Server` |
| **Instance Type** | `m7i-flex.large` (2 vCPUs, 8 GiB RAM) |
| **Operating System** | Ubuntu 26.04 LTS (x86_64) |
| **Public IPv4** | `18.212.83.78` |
| **Public DNS** | `ec2-18-212-83-78.compute-1.amazonaws.com` |
| **Storage** | 20 GiB General Purpose SSD (`gp3`) |
| **Installed Runtimes** | Docker Engine `v29.8.0`, Docker Compose `v5.5.1`, Git |

### Inbound Firewall (Security Group) Rules

| Port | Protocol | Source | Purpose |
| :--- | :--- | :--- | :--- |
| `22` | TCP | `0.0.0.0/0` | SSH remote management & GitHub Actions CD runner |
| `8000` | TCP | `0.0.0.0/0` | SignalScope FastAPI API & Interactive Swagger UI |
| `3000` | TCP | `0.0.0.0/0` | Grafana metrics visualization dashboard |
| `9090` | TCP | `0.0.0.0/0` | Prometheus time-series metrics query engine |

---

## 4. SSH Key Management & Security

* **Local Private Key File:** `/home/mihir/Downloads/signalscope-key.pem`
* **Local Backup Copy:** `/home/mihir/.ssh/signalscope-key.pem`
* **Permissions:** Restricted to `chmod 400` (read-only by owner).
* **EC2 Deploy Key:** Dedicated SSH Deploy Key generated on EC2 (`id_ed25519`) and registered to GitHub repository `mihir021/SignalScope` for passwordless, secure code cloning.

### How to SSH into the Server:
```bash
ssh -i /home/mihir/Downloads/signalscope-key.pem ubuntu@18.212.83.78
```

---

## 5. GitHub Repository & CI/CD Pipeline

* **Repository:** [https://github.com/mihir021/SignalScope](https://github.com/mihir021/SignalScope)
* **Visibility:** Private
* **Configured Repository Secrets:**

| Secret Name | Description | Value |
| :--- | :--- | :--- |
| `EC2_HOST` | Public IP address of the EC2 instance | `18.212.83.78` |
| `EC2_USER` | SSH username | `ubuntu` |
| `EC2_SSH_KEY` | Private SSH key for EC2 login | Contents of `signalscope-key.pem` |

### CI/CD Pipeline Stages (`deploy.yml`):
1. **Trigger:** Automatically runs on every push to the `main` branch.
2. **Build Stage:** Builds the application Docker container inside the GitHub runner to catch syntax errors or missing dependencies before deployment.
3. **Deploy Stage:** Connects to the EC2 server over SSH via `appleboy/ssh-action@v1.2.1`:
   - Clones repository on EC2 if not yet present.
   - Pulls the latest commits with `git fetch && git reset --hard origin/main`.
   - Executes `docker compose down && docker compose up -d --build`.
   - Cleans dangling images with `docker image prune -f`.

---

## 6. Endpoints & Observability

| Service | Port | Endpoint URL | Description |
| :--- | :--- | :--- | :--- |
| **API Health** | `8000` | `http://18.212.83.78:8000/` | Confirms API operational status |
| **Swagger UI** | `8000` | `http://18.212.83.78:8000/docs` | Interactive OpenAPI documentation |
| **Inference** | `8000` | `http://18.212.83.78:8000/predict` | `POST` image upload classification |
| **Metrics** | `8000` | `http://18.212.83.78:8000/metrics` | Prometheus scraped telemetry |
| **Prometheus** | `9090` | `http://18.212.83.78:9090` | TSDB query console |
| **Grafana** | `3000` | `http://18.212.83.78:3000` | Monitoring dashboards (`admin` / `admin`) |

### Grafana Dashboard Setup:
1. Access `http://18.212.83.78:3000` (User: `admin`, Password: `admin`).
2. Add Prometheus Data Source: URL = `http://prometheus:9090`.
3. Import Dashboard ID **`12900`** (*FastAPI Observability*).

---

## 7. Operational Commands Quick Reference

### Running Locally:
```bash
# Build and run containers
docker compose up -d --build

# View container logs
docker compose logs -f

# Stop containers
docker compose down
```

### Checking EC2 Status from Local Machine:
```bash
# Check containers on EC2
ssh -i /home/mihir/Downloads/signalscope-key.pem ubuntu@18.212.83.78 "docker compose -f ~/SignalScope/docker-compose.yml ps"
```
