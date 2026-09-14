# SignalScope Backend Code Audit & Bug Report

**Generated on:** September 15, 2026  
**Audited Branch:** `origin/api-response-overlay-opt-in` (commit `5489289`)  
**Scope:** `app/`, `model/`, `scripts/`, `tests/`, `Dockerfile`, `docker-compose.yml`, `.github/workflows/`

---

## Executive Summary

1. **Immediate Test Breakage:** Commit `5489289` (*"Make detailed overlay output opt-in"*) made `overlay_base64` opt-in via `include_overlay: bool = Query(False)` on `POST /predict/detailed`. However, `tests/test_api.py:150` was **not updated**, causing `pytest` to fail with an `AssertionError`. This breaks the CI quality gate on all PRs.
2. **Docker & Deployment Risks:** The container healthcheck period (`5s`) is too short for PyTorch/CLIP startup (causing container restart loops), and `best_classifier.pt` is ignored by Git, leaving Docker to run untrained random weights.
3. **Data Integrity Issues:** Validation and test evaluation both sample from the Defactify validation split, causing **data leakage** between model selection and reported metrics.
4. **Script & Diagnostic Bugs:** Scripts contain hardcoded user machine paths, unhandled single-class confusion matrix crashes, and non-JSON-serializable NumPy arrays.

---

## 1. Immediate Blocker: Test Suite Desync (New Branch)

### Bug 1: `AssertionError` in `test_predict_detailed_endpoint`
* **File:** `tests/test_api.py:143-154`
* **Introduced in Commit:** `5489289` (*"Make detailed overlay output opt-in"*)
* **Problem:** 
  The new branch changed `POST /predict/detailed` to omit `overlay_base64` by default unless `?include_overlay=true` is passed. However, the test still asserts `"overlay_base64" in data`:
  ```python
  # tests/test_api.py (Lines 143-154)
  response = client.post("/predict/detailed", files=files)
  assert response.status_code == 200
  data = response.json()
  assert "explanation_cues" in data
  assert "explanation_summary" in data
  assert "overlay_base64" in data  # ❌ Fails with AssertionError!
  ```
* **Impact:** `pytest tests/ -v` fails in local testing and on GitHub Actions CI.
* **Fix:** Update `tests/test_api.py` to test both default and opt-in modes:
  ```python
  def test_predict_detailed_endpoint():
      """Verifies that POST /predict/detailed returns explainability cues without overlay by default."""
      image_bytes = create_test_image_bytes("JPEG", size=(128, 128))
      files = {"file": ("test_explain.jpg", image_bytes, "image/jpeg")}

      response = client.post("/predict/detailed", files=files)
      assert response.status_code == 200
      data = response.json()
      assert data["status"] == "success"
      assert "explanation_cues" in data
      assert "explanation_summary" in data
      assert "overlay_base64" not in data  # Default is opt-in
      assert "hotspot_region" in data["explanation_cues"]

  def test_predict_detailed_endpoint_with_overlay():
      """Verifies that POST /predict/detailed?include_overlay=true returns overlay_base64."""
      image_bytes = create_test_image_bytes("JPEG", size=(128, 128))
      files = {"file": ("test_explain.jpg", image_bytes, "image/jpeg")}

      response = client.post("/predict/detailed?include_overlay=true", files=files)
      assert response.status_code == 200
      data = response.json()
      assert data["status"] == "success"
      assert "overlay_base64" in data
      assert len(data["overlay_base64"]) > 100
  ```

---

## 2. Docker & Infrastructure Bugs

### Bug 2: Container Healthcheck Kills Container on Startup
* **Files:** `Dockerfile:58` and `docker-compose.yml:28-29`
* **Problem:** 
  ```dockerfile
  HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
      CMD curl -f http://localhost:8000/ || exit 1
  ```
  On cold start, FastAPI imports `ImageClassifier()`, which initializes PyTorch and downloads the CLIP ViT-B/16 model from Hugging Face (~350MB). On CPU-based environments (e.g. AWS EC2 t3/c6i), this takes 30–60 seconds. Docker begins checking after 5 seconds and fails 3 retries (15 seconds total), marking the container as **`UNHEALTHY`** and triggering restart loops.
* **Fix:** Update `--start-period` to `60s` or `90s`:
  ```dockerfile
  HEALTHCHECK --interval=20s --timeout=10s --start-period=60s --retries=3 \
      CMD curl -f http://localhost:8000/ || exit 1
  ```

### Bug 3: Model Weights Missing from Container (Untrained Inference)
* **Files:** `Dockerfile:47-49`, `.gitignore:63`, `model/predict.py:68-77`
* **Problem:** 
  `.gitignore` excludes `model/weights/*.pt` and `*.safetensors`. When building the image on EC2 or CI, `model/weights/best_classifier.pt` is not present. In `model/predict.py`:
  ```python
  if os.path.exists(self.model_path):
      ...
  else:
      logger.info(f"No checkpoint found at '{self.model_path}'. Running with initialized weights.")
  ```
  The container boots without error, but runs with **completely random, untrained neural weights**.
* **Fix:** Add a download script (e.g. `scripts/download_weights.py`) that pulls the checkpoint from S3/Releases during Docker build, or mount the weights folder via a volume in `docker-compose.yml`.

### Bug 4: Missing `safetensors` in `requirements.txt`
* **Files:** `requirements.txt`, `model/train.py:25`
* **Problem:** `model/train.py:25` imports `from safetensors.torch import save_model`, but `safetensors` is omitted from `requirements.txt`. Clean environment installations fail with `ModuleNotFoundError`.
* **Fix:** Add `safetensors>=0.4.0` to `requirements.txt`.

### Bug 5: SSH Git Clone Fails on EC2 Without Deploy Keys
* **File:** `.github/workflows/deploy.yml:95`
* **Problem:** 
  `git clone git@github.com:mihir021/SignalScope.git "$HOME/SignalScope"`
  Cloning over SSH (`git@github.com:...`) requires GitHub SSH keys on the EC2 host. If not configured, the deployment script aborts with `Permission denied (publickey)`.
* **Fix:** For a public repository, use HTTPS:
  ```bash
  git clone https://github.com/mihir021/SignalScope.git "$HOME/SignalScope"
  ```

---

## 3. Backend API & Model Logic Bugs (`app/` & `model/`)

### Bug 6: Internal Server Errors Masked as 422 Client Errors
* **File:** `app/main.py:136-141` and `app/main.py:198-203`
* **Problem:** 
  ```python
  except Exception as exc:
      logger.error(f"Failed to process image: {str(exc)}", exc_info=True)
      raise HTTPException(
          status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
          detail=f"Corrupt or unsupported image file: {str(exc)}"
      )
  ```
  If PyTorch crashes (e.g., CUDA OOM, missing checkpoint, model runtime error), the exception is caught and returned as HTTP 422 (*"Corrupt or unsupported image"*). Server-side bugs are masked as client errors, polluting Prometheus error metrics.
* **Fix:** Separate image validation from model execution:
  ```python
  # 1. Validate image (Pillow) -> Return 422 on corrupt image
  try:
      with Image.open(io.BytesIO(image_bytes)) as img:
          img.verify()
  except Exception:
      raise HTTPException(status_code=422, detail="Corrupt or unsupported image file.")

  # 2. Run model inference -> Let unhandled crashes return 500
  prediction = classifier.predict(pil_image, caption=caption)
  ```

### Bug 7: Non-JSON-Serializable NumPy Arrays in `predict_detailed`
* **File:** `model/predict.py:356-360`
* **Problem:** 
  `diagnostics["fft_spectrum_2d"]` and `diagnostics["noise_residual_2d"]` are raw 2D `np.ndarray` objects (224x224). Any script or API endpoint calling `json.dumps(detailed_res)` crashes with:
  `TypeError: Object of type ndarray is not JSON serializable`
* **Fix:** Convert arrays to lists (`.tolist()`) or summarize them into scalars before returning.

### Bug 8: Validation & Test Set Data Leakage
* **Files:** `model/evaluate.py:74-78`, `model/train.py:136-154`, `model/splits.py`
* **Problem:** 
  `model/splits.py` was written to provide `get_disjoint_val_test_indices()`, but **neither `train.py` nor `evaluate.py` imports or uses it**. Both scripts load Defactify's `"validation"` split.
  * `train.py` uses this split to select the best checkpoint.
  * `evaluate.py` uses this split to compute final reported metrics.
  This is data leakage and invalidates the claimed "held-out" test evaluation.
* **Fix:** Import and use `get_disjoint_val_test_indices()` from `model.splits`, or configure `evaluate.py` to use Defactify's `"test"` split.

### Bug 9: Redundant Double Inference on Fake Images
* **Files:** `model/predict.py:246-250`, `model/attribution.py:97-105`
* **Problem:** 
  When an image is predicted as `fake`, `predict()` invokes `attribution_predictor.predict_family(image)`. Inside `predict_family()`, the code re-runs `classifier.transform(image)`, re-runs `vision_encoder`, and re-extracts 128-d forensic features from scratch.
* **Impact:** Doubles latency and CPU computation for all fake images.
* **Fix:** Pass the already-computed `fused` embedding vector into `predict_family(fused_features)`.

### Bug 10: Unclosed File Handles in `LocalFolderDataset`
* **File:** `model/dataset.py:112`
* **Problem:** 
  `image = Image.open(path).convert("RGB")` leaves open file handles in memory. In multi-worker PyTorch DataLoaders, this causes `OSError: [Errno 24] Too many open files` on Linux and file-locking on Windows.
* **Fix:**
  ```python
  with Image.open(path) as img:
      image = img.convert("RGB")
  ```

---

## 4. Scripts & Benchmark Bugs (`scripts/`)

### Bug 11: Hardcoded Local Paths in Analysis Scripts
* **Files:** `scripts/inspect_astronaut_cat.py:13` and `scripts/generate_master_panel.py:159`
* **Problem:** 
  Hardcoded Windows path:
  `r"C:\Users\DELL\.gemini\antigravity-ide\brain\8f36139a-88cb-45a9-b258-f3315609035e\..."`
* **Impact:** Any other team member running these scripts crashes with `FileNotFoundError`.
* **Fix:** Use CLI arguments via `argparse` or relative paths in `report/`.

### Bug 12: Unhandled Single-Class Crash in `evaluate_zip.py`
* **File:** `scripts/evaluate_zip.py:258-259` and `268-269`
* **Problem:** 
  ```python
  cm = confusion_matrix(all_labels, all_preds)
  tn, fp, fn, tp = cm.ravel()
  ```
  If an archive has only real or only fake images, `cm` is shape `(1, 1)`. Unpacking 4 values throws `ValueError: not enough values to unpack (expected 4, got 1)`.
* **Fix:** Pass explicit labels:
  ```python
  cm = confusion_matrix(all_labels, all_preds, labels=[0, 1])
  ```

### Bug 13: Zip Directory Prefix Bug in `evaluate_zip.py`
* **File:** `scripts/evaluate_zip.py:89-92`
* **Problem:** 
  `if norm_prefix and not parts[0].startswith(norm_prefix): continue`
  If an archive has an enclosing directory (e.g. `cifake/test/REAL/001.jpg`), `parts[0]` is `"cifake"`, not `"test"`. All samples are skipped and dataset length is 0.
* **Fix:** Check `if norm_prefix in parts:` instead.

### Bug 14: Class 3 (GAN) Has 0 Training Samples in Attribution Head
* **File:** `scripts/train_attribution_head.py:31-44`
* **Problem:** The head outputs 4 classes, but `map_generator_to_family()` maps Defactify IDs 1 to 5 to classes 0, 1, and 2. Class 3 (*GAN / Legacy*) has 0 samples in the training set.
* **Fix:** Either set `num_families=3` for Defactify, or supplement training with a GAN dataset.

### Bug 15: Redundant Heatmap Generation in `generate_master_panel.py`
* **File:** `scripts/generate_master_panel.py:52-57`
* **Problem:** Line 52 calls `predict_detailed()`, which computes the ViT saliency map. Line 55 re-instantiates `ExplainabilityPipeline` and recomputes the saliency map a second time.
* **Fix:** Reuse the saliency map/overlay returned by `predict_detailed()`.

---

## 5. Healthcheck & Test Suite Bugs (`tests/`)

### Bug 16: Overly Strict Checkpoint Guard in `model_healthcheck.py`
* **File:** `tests/model_healthcheck.py:66-74`
* **Problem:** 
  ```python
  missing, unexpected = model.load_state_dict(state_dict, strict=False)
  if missing:
      raise RuntimeError("Refusing to run a health check on a partially-loaded model.")
  ```
  Checkpoints often exclude frozen backbone weights (`vision_encoder.*`) to save disk space (~340MB). In `predict.py`, non-critical backbone missing keys are tolerated:
  `critical_missing = [k for k in missing if "vision_encoder" not in k]`
  In `model_healthcheck.py`, any missing key crashes the script immediately.
* **Fix:** Filter out `vision_encoder` keys before asserting `missing`.

---

## Teammate Action Checklist

- [ ] **P0 (Blocker):** Update `tests/test_api.py:150` to test both `overlay_base64` default (omitted) and opt-in (`?include_overlay=true`) so CI passes.
- [ ] **P0 (Docker):** Change `Dockerfile:58` healthcheck `--start-period=5s` to `60s` to prevent container restart loops.
- [ ] **P0 (Docker):** Add automated download or volume mount for `model/weights/best_classifier.pt`.
- [ ] **P1 (Deps):** Add `safetensors>=0.4.0` to `requirements.txt`.
- [ ] **P1 (CI/CD):** Change `git clone git@github.com...` to HTTPS in `.github/workflows/deploy.yml:95`.
- [ ] **P1 (Data):** Wire `model/splits.py` into `model/train.py` and `model/evaluate.py` to prevent data leakage.
- [ ] **P1 (API):** Separate image decoding from model execution in `app/main.py` so server errors return 500 instead of 422.
- [ ] **P1 (Model):** Convert NumPy arrays in `predict_detailed["diagnostics"]` to JSON-serializable types.
- [ ] **P2 (Perf):** Pass pre-extracted features into `predict_family()` to eliminate 2x inference overhead on fake images.
- [ ] **P2 (Scripts):** Remove hardcoded machine paths in `scripts/inspect_astronaut_cat.py` and `scripts/generate_master_panel.py`.
