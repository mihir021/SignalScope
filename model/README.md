# SignalScope ML Model Directory

This directory houses the core Dual-Stream Classifier architecture, forensic feature extraction engine, dataset pipelines, and calibrated inference interfaces for SignalScope.

## Architecture Overview
- **Visual Stream:** Frozen CLIP ViT-B/16 backbone (`512-d`) with LayerNorm scale normalization.
- **Forensic Stream:** 2D-FFT azimuthal power spectrum profile (`64-d`) + noise residual statistical moments (`64-d`) with MLP projection (`128-d`).
- **Fusion Head:** Multimodal MLP with LayerNorm, GELU, and Dropout (`640 -> 256 -> 64 -> 2`).
- **Calibration:** Learned post-training Temperature Scaling parameter ($T$) for well-calibrated confidence probabilities.

## File Manifest
- `classifier.py`: PyTorch `DualStreamClassifier` combining CLIP ViT-B/16, `ForensicExtractor`, and `TemperatureScaler`.
- `forensic.py`: Mathematical feature extraction engine (2D-FFT azimuthal averaging and sensor noise residual moments).
- `dataset.py`: Robust data loading pipelines with synchronized JPEG compression ($Q \in [40, 90]$) and horizontal flip augmentations.
- `splits.py`: Canonical data split utility enforcing non-overlapping validation and test index generation.
- `train.py`: Mixed-precision (`torch.amp`) training loop with AdamW, Cosine Annealing, and L-BFGS temperature calibration.
- `evaluate.py`: Evaluation suite generating ROC-AUC curves, confusion matrices, and metrics summaries.
- `predict.py`: Production inference interface implementing the required `predict(image_input)` contract.
- `weights/`: Checkpoints (`best_classifier.pt` and `best_classifier.safetensors`).
