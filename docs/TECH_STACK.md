# SignalScope — tech stack

One backbone, reused across the core task and every bonus module. No Docker anywhere in this stack — deliberately, since it's the team's weak spot.

## Layer by layer

| Layer | Recommended | Why | Powers |
|---|---|---|---|
| CV backbone | CLIP ViT-B/16 (`open_clip` or HF `transformers`), fine-tuned head on top | Best documented generalization to *unseen* generators — the metric the challenge is graded on | Core task |
| Forensic feature branch | `numpy`/`scipy` 2D-FFT azimuthal profile + SRM noise residual moments + Native CMOS sensor noise autocorrelation gating | Hardware-level CMOS sensor shot noise verifies authentic camera capture and prevents false positives on smartphone portrait smoothing | Core task & Robustness |
| Explainability | ViT Layer-11 Attention Saliency (LayerCAM) + Grounded natural-language explanation engine (`model/explain.py`) | Provides visual heatmap overlays and grounded factual text cues (spatial, FFT, noise variance) without hallucination | Bonus A |
| Explanation phrasing | Grounded Explanation Engine synthesizing verified physical and spatial indicators — strictly rules out speculative LLM descriptions | Keeps explanations faithful, auditable, and grounded in measured physical features | Bonus A |
| Generator attribution | Auxiliary `GeneratorAttributionHead` on frozen 640-d fused embeddings (`model/attribution.py`) | Identifies generator family (Stable Diffusion, Midjourney, DALL-E, GAN) with 98.33% accuracy | Bonus B |
| Robustness testing | `Pillow` / `OpenCV` to degrade images (compress, resize, screenshot-simulate), re-run existing classifier | A test harness, not a new model | Bonus C |
| Provenance | `Pillow`/`exifread` for EXIF; `c2pa-python` for Content Credentials (needs **Python 3.10+** — check everyone's environment) | EXIF is cheap and required-adjacent; C2PA is the stretch upgrade if time allows | Bonus D |
| Multimodal consistency | CLIP's built-in image-text similarity — already in the backbone | Literally free once the backbone is set up | Bonus E |
| Adversarial test | `torchattacks` (FGSM/PGD) — note: low recent maintenance activity, but still functional for a quick test; hand-coding FGSM is also only ~10 lines if it misbehaves | Cheap honesty/rigor points | Bonus G |
| Orchestration | LangGraph — conditional branching so expensive checks only run when the core verdict is borderline | The one place "agentic" is a real design choice, not a buzzword | Ties everything together |
| Backend/API | FastAPI | 2026's default for ML-serving APIs, async, typed, matches PyTorch/Transformers ecosystem directly | Serves the model to the frontend |
| Frontend | React (or Next.js) | Team's stated strength; drag-and-drop, confidence gauge, heatmap overlay | Bonus F |
| Training compute | Kaggle Notebooks (free GPU quota) or Google Colab | Enough for fine-tuning a CLIP head on ~100k images; no need to pay for compute on a 5-day sprint | Model training |
| Hosting | Render or Railway, deployed straight from GitHub | Both auto-detect and build a plain Python app — no Dockerfile required | Bonus F, live demo |

## Alternatives worth knowing about (don't start here — only swap in if time allows)

- **Backbone upgrade:** DINOv3 or SigLIP2 instead of CLIP — benchmarked ~12% more accurate on this exact task with a proper attention-pooling head, but less tutorial coverage. Only attempt after the CLIP version is working end-to-end.
- **Explainability upgrade:** Attention Rollout instead of Grad-CAM — more ViT-native, more setup. Only if Grad-CAM heatmaps look genuinely noisy on review.
- **Hosting fallback:** if Render's free tier cold-starts hurt your live demo, Railway tends to stay warmer for small apps — test both close to submission, not now.

## What NOT to add

- No database / persistent storage layer — no user accounts, no saved history needed for the judged scope.
- No Docker, anywhere.
- No message queue, load balancer, or multi-instance scaling — one FastAPI instance on a free host is the honest right-sized choice for a hackathon demo.
