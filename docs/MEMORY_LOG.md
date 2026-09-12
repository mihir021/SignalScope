# 🧠 SignalScope — Development Memory Log

**Date:** 11–12 September 2026  
**Session Focus:** Phase 0 & Phase 1 — Core Classifier Architecture, Build, Calibration & Stage 1 Baseline  
**Hardware Profile:** NVIDIA GeForce RTX 3050 Laptop GPU (6GB VRAM, Driver 581.95, CUDA 12.4/13.0)  
**Python Environment:** Python 3.12.10 (`.venv`)  
**Git Repository:** [mihir021/SignalScope](https://github.com/mihir021/SignalScope.git) (Branch: `main`)  

---

## 1. Executive Summary & Accomplishments Today

Today we designed, built, trained, and verified the **Core Dual-Stream Classifier** for SignalScope from scratch, fully adhering to the SIH 2026 Problem Statement ([signalscope.pdf](file:///c:/Users/DELL/Desktop/SignalScope/signalscope.pdf)) and [TECH_STACK.md](file:///c:/Users/DELL/Desktop/SignalScope/TECH_STACK.md).

### Key Milestones Completed:
1. **Environment Setup (Phase 0):** Installed PyTorch 2.6.0 with native CUDA 12.4 support, verified GPU acceleration on RTX 3050, and updated [requirements.txt](file:///c:/Users/DELL/Desktop/SignalScope/requirements.txt).
2. **Dual-Stream Architecture (Phase 1):** Built the hybrid classifier fusing **CLIP ViT-B/16** visual semantics with **2D-FFT azimuthal frequency spectra** and **noise residual statistics** to solve the unseen-generator generalization challenge.
3. **Robust Data Pipeline:** Integrated CIFAKE (100k training, 20k test) with live **random JPEG compression augmentation** ($Q \in [40, 90]$) to protect against compressed social media images.
4. **Stage 1 Baseline Training:** Trained for 3 epochs with mixed precision (AMP) and label smoothing ($0.05$).
5. **Confidence Calibration:** Implemented post-training Temperature Scaling via L-BFGS, finding the optimal calibration scalar $T = 0.9006$.
6. **Evaluation & Reporting:** Evaluated on 2,000 unseen test samples; generated official report artifacts: [report/confusion_matrix.png](file:///c:/Users/DELL/Desktop/SignalScope/report/confusion_matrix.png), [report/roc_curve.png](file:///c:/Users/DELL/Desktop/SignalScope/report/roc_curve.png), and [report/metrics.json](file:///c:/Users/DELL/Desktop/SignalScope/report/metrics.json).
7. **Production Interface & Tests:** Updated [model/predict.py](file:///c:/Users/DELL/Desktop/SignalScope/model/predict.py) to replace the placeholder mock. **Passed 100% (7/7) of the automated tests** in `pytest tests/test_api.py`.

---

## 2. Core Classifier Architecture

```
                    INPUT IMAGE (RGB, 224x224)
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
      [Visual Stream]                 [Forensic Stream]
      CLIP ViT-B/16                   2D-FFT Radial Profile (64-d)
      (Frozen Backbone)               + Noise Residual Moments (64-d)
               │                               │
      Visual Embeds (512-d)           Forensic Vector (128-d)
               │                               │
               │                               ▼
               │                      Forensic Projection (128-d)
               │                               │
               └───────────────┬───────────────┘
                               │
                               ▼
                    Concatenation (640-d)
                               │
                               ▼
                     Fusion Classifier Head
                   (LayerNorm + GELU + Dropout)
                               │
                               ▼
                       Raw Logits (2-d)
                               │
                               ▼
                 Temperature Scaling (Logits ÷ T)
                           (T = 0.9006)
                               │
                               ▼
                    Calibrated Probabilities
                    [P(REAL), P(FAKE)]
```

---

## 3. Files Created & Modified

| File Path | Role & Purpose | Status |
| :--- | :--- | :---: |
| [model/forensic.py](file:///c:/Users/DELL/Desktop/SignalScope/model/forensic.py) | Mathematical forensic feature extractor: 64-bin 2D-FFT azimuthal power spectrum + 64-dim noise residual statistical moments (variance, skew, kurtosis, cross-channel correlation). | Verified |
| [model/classifier.py](file:///c:/Users/DELL/Desktop/SignalScope/model/classifier.py) | PyTorch `DualStreamClassifier` combining CLIP ViT-B/16 + forensic projection + fusion head + `TemperatureScaler`. | Verified |
| [model/dataset.py](file:///c:/Users/DELL/Desktop/SignalScope/model/dataset.py) | PyTorch dataset loader for CIFAKE with on-the-fly random JPEG compression degradation and CLIP normalization transforms. Also includes `LocalFolderDataset` for custom data. | Verified |
| [model/train.py](file:///c:/Users/DELL/Desktop/SignalScope/model/train.py) | Training loop with mixed-precision (AMP), AdamW + CosineAnnealing, label smoothing ($0.05$), model checkpointing, and L-BFGS temperature calibration. | Verified |
| [model/evaluate.py](file:///c:/Users/DELL/Desktop/SignalScope/model/evaluate.py) | Comprehensive evaluation script calculating ROC-AUC, Macro-F1, Precision, Recall, FPR, Confusion Matrix, and saving plots. | Verified |
| [model/predict.py](file:///c:/Users/DELL/Desktop/SignalScope/model/predict.py) | Official production interface contract: `ImageClassifier.predict(image)` accepting PIL Image or file path; returns calibrated `{label, confidence, probabilities}`. | Verified (7/7 tests passed) |
| [requirements.txt](file:///c:/Users/DELL/Desktop/SignalScope/requirements.txt) | Added core ML dependencies (`torch`, `torchvision`, `transformers`, `open-clip-torch`, `scipy`, `scikit-image`, `datasets`, `scikit-learn`, `matplotlib`, `tqdm`). | Verified |
| `model/weights/best_classifier.pt` | Trained PyTorch state dict + calibration parameter checkpoint. | Saved |
| `model/weights/best_classifier.safetensors` | Safe, fast-loading tensor weight format. | Saved |
| [report/metrics.json](file:///c:/Users/DELL/Desktop/SignalScope/report/metrics.json) | Full metrics summary on 2,000 held-out test images. | Generated |
| [report/confusion_matrix.png](file:///c:/Users/DELL/Desktop/SignalScope/report/confusion_matrix.png) | Visual confusion matrix plot (941 True Reals, 946 True Fakes). | Generated |
| [report/roc_curve.png](file:///c:/Users/DELL/Desktop/SignalScope/report/roc_curve.png) | Visual ROC curve demonstrating AUC = 0.9889. | Generated |

---

## 4. Stage 1 Baseline Benchmark Results

Evaluated on **2,000 unseen test samples** (1,023 AI / 977 Real):

* **ROC-AUC (Primary Ranking Metric):** **0.9889 (98.89%)**
* **Overall Accuracy:** **0.9435 (94.35%)**
* **Macro-F1 Score:** **0.9435 (94.35%)**
* **Precision:** **0.9633 (96.33%)**
* **Recall (AI Catch Rate):** **0.9247 (92.47%)**
* **False Positive Rate (FPR):** **0.0368 (3.68%)** *(Only 36 real images misflagged out of 977)*
* **Learned Calibration Temperature ($T$):** **0.9006**

### Confusion Matrix Numbers:
```
                      PREDICTED REAL       PREDICTED AI (FAKE)
ACTUAL REAL:               941                     36           (96.3% Specificity)
ACTUAL AI (FAKE):           77                    946           (92.5% Sensitivity)
```

---

## 5. Decision Trace Case Studies (How the Model Decided)

### Sample 1: Real Camera Photograph
* **Input:** Authentic photograph (CIFAR-10 real test set).
* **Forensic Signals:**
  * 2D-FFT Radial Peak: `3.7081` (Smooth natural $1/f^\alpha$ power spectrum falloff; no upsampling harmonics).
  * Noise Variance: `0.000013` (Organic camera sensor distribution; kurtosis `35.28`).
* **Calibrated Output:** $P(\text{REAL}) = \mathbf{97.87\%}$, $P(\text{AI}) = 2.13\%$
* **Verdict:** **`REAL` (Confidence: 97.87%)** ✅ *[Correct]*

### Sample 2: Synthetic AI-Generated Image (Stable Diffusion)
* **Input:** Synthetic image generated by Stable Diffusion.
* **Forensic Signals:**
  * 2D-FFT Radial Peak: `3.5406` (Generative upsampler checkerboard grid harmonics).
  * Noise Variance: `0.000020` (Synthetic noise kurtosis jumped unnaturally to **`49.19`**).
* **Calibrated Output:** $P(\text{REAL}) = 1.05\%$, $P(\text{AI}) = \mathbf{98.95\%}$
* **Verdict:** **`FAKE` (Confidence: 98.95%)** ✅ *[Correct]*

---

## 6. Plan for Tomorrow (Next Steps)

1. **Stage 2 Execution (Full-Scale 100k Training):**
   * Run full training across all 100,000 CIFAKE training images (50k Real / 50k Synthetic).
   * Command:
     ```powershell
     .\.venv\Scripts\python.exe model/train.py --epochs 3 --batch_size 64 --subset_size 100000 --val_subset_size 5000 --lr 3e-4
     ```
   * Updates `model/weights/best_classifier.pt` with maximum cross-prompt coverage.
2. **Re-Run Comprehensive Evaluation:**
   * Generate final production metrics for the one-page report in [report/README.md](file:///c:/Users/DELL/Desktop/SignalScope/report/README.md).
3. **Optional Bonus Module Groundwork (Phase 2):**
   * Hook up **Grad-CAM saliency heatmaps** (Bonus A: Explainability) using the existing ViT backbone.
   * Add generator family attribution head (Bonus B).
