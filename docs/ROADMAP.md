# SignalScope — roadmap

**Time budget:** all substantive commits must land between **10–15 September** (per the challenge's originality rule). That's today through 5 days from now, for a 6-person team. Phases are ordered by dependency, not by even day-splits — some phases run in parallel across teammates.

## Phase 0 — Repo, data, and environment (day 1)
**Reason for this boundary:** nothing else can start until the data is downloaded and everyone can run the same code.

- Set up the repo with the required structure (`/app`, `/model`, `/report`, `README.md`, `requirements.txt`).
- Download the provided training set; confirm everyone can load a batch of images.
- Confirm Python versions across all six laptops — `c2pa-python` (Bonus D) needs 3.10+, catch mismatches now, not on day 4.
- Set up shared Kaggle/Colab access so GPU time isn't a bottleneck later.

**Done when:** everyone has cloned the repo, installed dependencies, and can load one training image in a notebook.

## Phase 1 — Core classifier (days 1–2)
**Reason for this boundary:** this is the mandatory gate. The rules are explicit that a broken core outscores a working core with zero bonuses — nothing below matters if this doesn't work.

- Fine-tune CLIP ViT-B/16 head on the provided training set.
- Add the frequency/noise-residual branch, concatenate with the CLIP embedding.
- Honest train/val split, calibrate confidence, implement the exact `predict(image_path)` interface the organizers require.
- Report ROC-AUC, macro-F1, confusion matrix on your own validation split (not their held-out set — you don't have that).

**Done when:** `predict.py` runs from a clean checkout and returns a label + confidence on a new image, with real metrics logged.

**Load-bearing — cannot be cut or descoped.**

## Phase 2 — Bonuses that reuse the same backbone (days 2–3)
**Reason for this boundary:** these three are cheap specifically because Phase 1 already exists — build them immediately after, while the backbone is fresh in whoever built it's head.

- **Bonus B (attribution):** second classifier head on the same embedding.
- **Bonus E (multimodal):** wire up CLIP's existing image-text similarity — this is mostly just calling a function you already have.
- **Bonus A, part 1 (explanation groundwork):** get Grad-CAM producing heatmaps on your ViT; don't wire up the LLM yet, just confirm the heatmaps look sane.

**Done when:** attribution head reports a metric, multimodal score returns a number for a test image+caption pair, and Grad-CAM heatmaps visibly highlight plausible regions on a few sample images.

## Phase 3 — Backend, orchestration, and remaining bonuses (days 3–4)
**Reason for this boundary:** you need the core + Phase 2 outputs before there's anything real for the API and agent to orchestrate.

Runs in parallel across teammates:
- **Backend stream:** FastAPI wrapping the model, `/predict` endpoint.
- **Orchestration stream:** LangGraph agent — confidence-based branching to trigger extra checks only when needed.
- **Explanation stream:** finish Bonus A by wiring verified Grad-CAM facts into an LLM prompt for the readable explanation.
- **Robustness stream (Bonus C):** degrade test images (compress/resize/screenshot), measure accuracy drop.
- **Provenance stream (Bonus D):** EXIF reading first (cheap), C2PA only if time allows.
- **Frontend stream:** build the 3 pages (Home, Result, About) against a mocked API response, so frontend isn't blocked waiting on backend.

**Done when:** hitting the FastAPI endpoint directly (e.g. via curl or Postman) returns a full JSON response with verdict, confidence, attribution, explanation, and whichever bonus fields are ready.

**Flexible — Bonus C, D, and G can be trimmed here if the team is behind schedule. Bonus A and the backend/orchestrator cannot.**

## Phase 4 — Integration and deployment (day 4–5)
**Reason for this boundary:** frontend and backend have been built against assumptions about each other; this is where those assumptions get tested for real.

- Connect the real frontend to the real backend, replacing mocks.
- Deploy to Render or Railway, straight from GitHub, no Dockerfile.
- **Bonus G (active defence):** run FGSM/PGD against the finished classifier, document what breaks it, honestly.
- Test the full flow from a clean machine — this is a dry run of the judges' "10 minutes from README" requirement.

**Done when:** a teammate who didn't build the app can clone the repo fresh, follow only the README, and get a prediction in under 10 minutes — and the deployed link works from a phone.

## Phase 5 — Report, video, and submission (day 5)
**Reason for this boundary:** this is pure documentation and can't start meaningfully until the system is feature-complete and deployed, or you'll be re-recording the demo video after last-minute bugfixes.

- Write the one-page model report (Section 7.3 of the brief): task, data & split, approach, metrics, baseline comparison, honest limitations.
- Finalize the README with setup instructions, reported metrics, and the originality declaration listing any third-party code referenced.
- Record the 3–5 minute demo video: core running on a new image first, then whichever bonus modules made it in.
- Final commit, final check that commit history genuinely spans the 10–15 window.

**Done when:** repo, report, and video are all linked and a fresh clone of the repo actually runs.

## What's flexible vs load-bearing, if you fall behind

| Can be cut without wrecking the outcome | Cannot move |
|---|---|
| Bonus G (active defence) | Core classifier (Phase 1) |
| Bonus D's C2PA half (keep EXIF) | Bonus A (dedicated 15-pt scoring axis) |
| Frontend's 3rd route (About page) | Reproducibility — README must run in 10 min |
| Backbone upgrade to DINOv3/SigLIP2 | Honest metric reporting (no leakage, no training on held-out data) |

## The honest failure mode for this plan

The most likely way this slips: **Phase 1 takes longer than planned because calibrating for the unseen-generator split is genuinely hard**, and the team either notices too late (day 4) or panics and starts bolting on bonus modules to a shaky core instead of hardening it. Watch for this specifically — if by the end of day 2 your validation AUC on held-out-style generators (not just your training distribution) isn't clearly above a naive baseline, stop building bonuses and go back to the core. A team with a solid core and two bonuses beats a team with a shaky core and six.
