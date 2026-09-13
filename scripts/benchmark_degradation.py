"""
SignalScope - Robustness to Degradation Benchmark Suite (Bonus Track C)
=======================================================================
Implements the formal degradation-vs-accuracy analysis required by SIH §3.2.
Stress-tests the dual-stream classifier across:
1. JPEG Compression: Quality Factors Q in [100, 85, 70, 50, 30, 15]
2. Resolution Downscaling: Scale Factors in [100%, 75%, 50%, 33%]
3. Gaussian Blurring: Kernels sigma in [0.0, 0.5, 1.0, 1.5, 2.0]

Generates report/degradation_metrics.json and report/degradation_robustness_curve.png
"""

import os
import sys
sys.path.insert(0, ".")
import io
import json
import logging
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from PIL import Image, ImageFilter
import torch
from datasets import load_dataset
from torch.utils.data import Subset
from sklearn.metrics import roc_auc_score, accuracy_score

from model.classifier import DualStreamClassifier
from model.dataset import DefactifyDataset, create_balanced_defactify_indices, get_transforms
from model.forensic import ForensicExtractor

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("signalscope-degradation")


def apply_jpeg(img: Image.Image, quality: int) -> Image.Image:
    if quality >= 100:
        return img
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality)
    buf.seek(0)
    return Image.open(buf).copy()


def apply_downscale(img: Image.Image, scale_pct: int) -> Image.Image:
    if scale_pct >= 100:
        return img
    w, h = img.size
    new_w = max(16, int(w * (scale_pct / 100.0)))
    new_h = max(16, int(h * (scale_pct / 100.0)))
    downscaled = img.resize((new_w, new_h), Image.Resampling.BILINEAR)
    return downscaled.resize((w, h), Image.Resampling.BICUBIC)


def apply_blur(img: Image.Image, sigma: float) -> Image.Image:
    if sigma <= 0.0:
        return img
    return img.filter(ImageFilter.GaussianBlur(radius=sigma))


def run_degradation_benchmark(
    model_path: str = "model/weights/best_classifier.pt",
    samples_to_test: int = 200,
    report_dir: str = "report"
):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    os.makedirs(report_dir, exist_ok=True)
    logger.info(f"Running degradation benchmark on {device} ({samples_to_test} samples)...")

    # 1. Load Model
    model = DualStreamClassifier(freeze_backbone=True).to(device)
    if os.path.exists(model_path):
        checkpoint = torch.load(model_path, map_location=device, weights_only=False)
        state_dict = checkpoint.get("model_state_dict", checkpoint)
        model.load_state_dict(state_dict, strict=False)
        logger.info(f"Loaded weights from {model_path}")
    model.eval()

    # 2. Load Test Samples
    raw_dataset = load_dataset("Rajarshi-Roy-research/Defactify_Image_Dataset", split="validation")
    eval_indices = create_balanced_defactify_indices(raw_dataset, samples_per_generator=max(1, samples_to_test // 10), seed=42)
    eval_indices = eval_indices[:samples_to_test]

    transform = get_transforms(is_train=False)
    forensic_extractor = ForensicExtractor()

    # Cache raw PIL images and labels
    cached_items = []
    for idx in eval_indices:
        item = raw_dataset[int(idx)]
        img = item.get("Image", item.get("image"))
        if not isinstance(img, Image.Image):
            img = Image.fromarray(img)
        img = img.convert("RGB")
        lbl = int(item.get("Label_A", item.get("label", 0)))
        cached_items.append((img, lbl))

    logger.info(f"Cached {len(cached_items)} images into memory for benchmarking.")

    # Helper evaluator
    def eval_under_perturbation(perturb_fn):
        y_true, y_probs = [], []
        with torch.no_grad():
            for img, lbl in cached_items:
                p_img = perturb_fn(img)
                # Visual
                pixel_t = transform(p_img).unsqueeze(0).to(device)
                # Forensic
                feats = forensic_extractor.extract_from_pil(p_img)
                feats_t = torch.tensor(feats, dtype=torch.float32).unsqueeze(0).to(device)

                probs = model.predict_probabilities(pixel_t, feats_t, calibrate=True)
                fake_prob = float(probs[0, 1].item())

                y_true.append(lbl)
                y_probs.append(fake_prob)

        y_true = np.array(y_true)
        y_probs = np.array(y_probs)
        y_preds = (y_probs >= 0.5).astype(int)

        auc = float(roc_auc_score(y_true, y_probs))
        acc = float(accuracy_score(y_true, y_preds))
        return round(acc * 100, 2), round(auc, 4)

    # 1. JPEG Compression Sweep
    jpeg_qualities = [100, 85, 70, 50, 30, 15]
    jpeg_accs, jpeg_aucs = [], []
    logger.info("Evaluating JPEG compression sweep...")
    for q in jpeg_qualities:
        acc, auc = eval_under_perturbation(lambda im: apply_jpeg(im, q))
        jpeg_accs.append(acc)
        jpeg_aucs.append(auc)
        logger.info(f"  JPEG Q={q:3d} -> Accuracy: {acc:.2f}%, AUC: {auc:.4f}")

    # 2. Resizing / Downscaling Sweep
    scales = [100, 75, 50, 33]
    scale_accs, scale_aucs = [], []
    logger.info("Evaluating resolution downscaling sweep...")
    for s in scales:
        acc, auc = eval_under_perturbation(lambda im: apply_downscale(im, s))
        scale_accs.append(acc)
        scale_aucs.append(auc)
        logger.info(f"  Scale={s:3d}% -> Accuracy: {acc:.2f}%, AUC: {auc:.4f}")

    # 3. Gaussian Blur Sweep
    blurs = [0.0, 0.5, 1.0, 1.5, 2.0]
    blur_accs, blur_aucs = [], []
    logger.info("Evaluating Gaussian blur sweep...")
    for b in blurs:
        acc, auc = eval_under_perturbation(lambda im: apply_blur(im, b))
        blur_accs.append(acc)
        blur_aucs.append(auc)
        logger.info(f"  Blur sigma={b:.1f} -> Accuracy: {acc:.2f}%, AUC: {auc:.4f}")

    results = {
        "jpeg_compression": {
            "qualities": jpeg_qualities,
            "accuracies": jpeg_accs,
            "roc_aucs": jpeg_aucs
        },
        "resolution_scaling": {
            "scale_percentages": scales,
            "accuracies": scale_accs,
            "roc_aucs": scale_aucs
        },
        "gaussian_blur": {
            "sigmas": blurs,
            "accuracies": blur_accs,
            "roc_aucs": blur_aucs
        }
    }

    # Save JSON
    json_path = os.path.join(report_dir, "degradation_metrics.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    logger.info(f"Saved degradation metrics to {json_path}")

    # Generate 3-Panel Publication Curve
    fig, axes = plt.subplots(1, 3, figsize=(18, 5))
    fig.suptitle("SignalScope Robustness to Real-World Image Degradation (SIH §3.2 Bonus C)", fontsize=14, fontweight="bold")

    # Panel 1: JPEG
    axes[0].plot(jpeg_qualities, jpeg_accs, "o-", color="#e74c3c", linewidth=2.5, markersize=7, label="Accuracy (%)")
    axes[0].plot(jpeg_qualities, [a * 100 for a in jpeg_aucs], "s--", color="#2980b9", linewidth=2, markersize=6, label="ROC-AUC (x100)")
    axes[0].set_xlabel("JPEG Quality Factor (Q)", fontsize=11, fontweight="bold")
    axes[0].set_ylabel("Metric Value (%)", fontsize=11, fontweight="bold")
    axes[0].set_title("JPEG Compression Resilience", fontsize=12, fontweight="bold")
    axes[0].set_ylim(50, 102)
    axes[0].grid(True, linestyle="--", alpha=0.6)
    axes[0].legend(loc="lower right")

    # Panel 2: Downscaling
    axes[1].plot(scales, scale_accs, "o-", color="#27ae60", linewidth=2.5, markersize=7, label="Accuracy (%)")
    axes[1].plot(scales, [a * 100 for a in scale_aucs], "s--", color="#8e44ad", linewidth=2, markersize=6, label="ROC-AUC (x100)")
    axes[1].set_xlabel("Image Resolution Scale (%)", fontsize=11, fontweight="bold")
    axes[1].set_title("Resolution Downscaling Resilience", fontsize=12, fontweight="bold")
    axes[1].set_ylim(50, 102)
    axes[1].grid(True, linestyle="--", alpha=0.6)
    axes[1].legend(loc="lower right")

    # Panel 3: Blur
    axes[2].plot(blurs, blur_accs, "o-", color="#d35400", linewidth=2.5, markersize=7, label="Accuracy (%)")
    axes[2].plot(blurs, [a * 100 for a in blur_aucs], "s--", color="#16a085", linewidth=2, markersize=6, label="ROC-AUC (x100)")
    axes[2].set_xlabel("Gaussian Blur Sigma (radius)", fontsize=11, fontweight="bold")
    axes[2].set_title("Gaussian Blurring Resilience", fontsize=12, fontweight="bold")
    axes[2].set_ylim(50, 102)
    axes[2].grid(True, linestyle="--", alpha=0.6)
    axes[2].legend(loc="lower left")

    plt.tight_layout()
    curve_path = os.path.join(report_dir, "degradation_robustness_curve.png")
    plt.savefig(curve_path, dpi=150)
    plt.close()
    logger.info(f"Saved degradation curve plot to {curve_path}")

    return results


if __name__ == "__main__":
    run_degradation_benchmark(samples_to_test=200)
