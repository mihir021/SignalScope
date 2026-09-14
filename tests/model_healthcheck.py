"""
SignalScope - Model Health Check
==================================
Run this against any checkpoint, at any point in development, to get an
honest read on whether the model is actually good - not just whether it
runs. Produces a JSON report plus plots under report/healthcheck/.

Sections:
  1. Standard metrics on a leakage-free held-out set (AUC, F1, accuracy, CM)
  2. Calibration check (Expected Calibration Error + reliability diagram)
  3. Stream-contribution ablation (does the forensic branch actually matter?)
  4. Robustness curve (AUC under JPEG degradation and blur - Bonus C signal)
  5. Confidence distribution sanity (catches degenerate "always 50%" or
     "always 99%" calibration failures)
  6. Optional: unseen-generator check against a folder of images the model
     has never trained on (e.g. Synthbuster) - this is the cross-domain benchmark
     that measures true out-of-distribution generalization.
  7. Trivial-baseline comparison (majority-class), so "0.87 AUC" has context

Usage:
        --test_samples 2000 \\
        --unseen_dir /path/to/synthbuster_or_other_generator_folder

The --unseen_dir should point to a LocalFolderDataset-style directory:
    unseen_dir/
      real/
      fake/
"""

import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import json
import argparse
import logging
import numpy as np
import matplotlib.pyplot as plt
import torch
from torch.utils.data import DataLoader, Subset
from PIL import Image, ImageFilter
import io

from sklearn.metrics import roc_auc_score, f1_score, accuracy_score, confusion_matrix

from model.classifier import DualStreamClassifier
from model.dataset import DefactifyDataset, LocalFolderDataset, create_balanced_defactify_indices, get_transforms

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("signalscope-healthcheck")


# ---------------------------------------------------------------------------
# Model loading
# ---------------------------------------------------------------------------

def load_model(model_path: str, device: torch.device) -> DualStreamClassifier:
    model = DualStreamClassifier(freeze_backbone=True).to(device)
    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"No checkpoint at {model_path}. A health check on an untrained "
            f"model tells you nothing - train first."
        )
    checkpoint = torch.load(model_path, map_location=device, weights_only=False)
    state_dict = checkpoint.get("model_state_dict", checkpoint)

    missing, unexpected = model.load_state_dict(state_dict, strict=False)
    critical_missing = [k for k in missing if "vision_encoder" not in k]
    if critical_missing or unexpected:
        logger.warning(f"Checkpoint mismatch - critical missing keys: {critical_missing}")
        logger.warning(f"Checkpoint mismatch - unexpected keys: {unexpected}")
        if critical_missing:
            raise RuntimeError(
                f"Refusing to run a health check on a partially-loaded model. Critical keys missing: {critical_missing}"
            )
    model.eval()
    return model


# ---------------------------------------------------------------------------
# Section 1: Standard metrics
# ---------------------------------------------------------------------------

def collect_predictions(model, loader, device):
    all_probs, all_preds, all_labels = [], [], []
    with torch.no_grad():
        for batch in loader:
            pixel_values = batch["pixel_values"].to(device)
            forensic_features = batch["forensic_features"].to(device)
            labels = batch["label"].to(device)

            probs = model.predict_probabilities(pixel_values, forensic_features, calibrate=True)
            fake_probs = probs[:, 1].cpu().numpy()
            preds = probs.argmax(dim=-1).cpu().numpy()

            all_probs.extend(fake_probs)
            all_preds.extend(preds)
            all_labels.extend(labels.cpu().numpy())
    return np.array(all_probs), np.array(all_preds), np.array(all_labels)


def compute_standard_metrics(probs, preds, labels) -> dict:
    try:
        auc = float(roc_auc_score(labels, probs))
    except ValueError:
        auc = float("nan")
    macro_f1 = float(f1_score(labels, preds, average="macro"))
    acc = float(accuracy_score(labels, preds))
    cm = confusion_matrix(labels, preds, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel()

    majority_class = int(np.round(labels.mean()))
    baseline_acc = float(max(labels.mean(), 1 - labels.mean()))

    return {
        "roc_auc": round(auc, 4),
        "macro_f1": round(macro_f1, 4),
        "accuracy": round(acc, 4),
        "trivial_majority_baseline_accuracy": round(baseline_acc, 4),
        "beats_trivial_baseline_by": round(acc - baseline_acc, 4),
        "confusion_matrix": {
            "true_negatives_real": int(tn), "false_positives": int(fp),
            "false_negatives": int(fn), "true_positives_ai": int(tp)
        },
        "n_samples": len(labels)
    }


# ---------------------------------------------------------------------------
# Section 2: Calibration (Expected Calibration Error)
# ---------------------------------------------------------------------------

def expected_calibration_error(probs, labels, n_bins=10) -> dict:
    """
    Bins predictions by confidence and checks whether stated confidence
    matches empirical accuracy in that bin. A well-calibrated "70% confident"
    prediction should be right about 70% of the time.
    """
    confidences = np.where(probs >= 0.5, probs, 1 - probs)
    preds = (probs >= 0.5).astype(int)
    correct = (preds == labels).astype(float)

    bin_edges = np.linspace(0.5, 1.0, n_bins + 1)
    ece = 0.0
    bin_report = []
    for i in range(n_bins):
        lo, hi = bin_edges[i], bin_edges[i + 1]
        mask = (confidences >= lo) & (confidences < hi if i < n_bins - 1 else confidences <= hi)
        if mask.sum() == 0:
            continue
        bin_acc = correct[mask].mean()
        bin_conf = confidences[mask].mean()
        bin_weight = mask.sum() / len(confidences)
        ece += bin_weight * abs(bin_acc - bin_conf)
        bin_report.append({
            "confidence_range": [round(float(lo), 2), round(float(hi), 2)],
            "empirical_accuracy": round(float(bin_acc), 4),
            "mean_stated_confidence": round(float(bin_conf), 4),
            "n_samples": int(mask.sum())
        })

    return {"expected_calibration_error": round(float(ece), 4), "bins": bin_report}


def plot_reliability_diagram(ece_report, out_path):
    bins = ece_report["bins"]
    if not bins:
        return
    stated = [b["mean_stated_confidence"] for b in bins]
    empirical = [b["empirical_accuracy"] for b in bins]

    plt.figure(figsize=(5, 5))
    plt.plot([0.5, 1.0], [0.5, 1.0], "k--", label="Perfect calibration")
    plt.plot(stated, empirical, "o-", color="darkorange", label="Model")
    plt.xlabel("Mean stated confidence")
    plt.ylabel("Empirical accuracy")
    plt.title(f"Reliability Diagram (ECE = {ece_report['expected_calibration_error']:.4f})")
    plt.legend()
    plt.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(out_path, dpi=150)
    plt.close()


# ---------------------------------------------------------------------------
# Section 3: Stream-contribution ablation
# ---------------------------------------------------------------------------

def stream_ablation_auc(model, loader, device) -> dict:
    """
    Zeroes out one stream at a time at inference and re-measures AUC.
    This does NOT retrain separate heads - it's a sensitivity probe, not a
    clean ablation study. But if zeroing the forensic stream barely moves
    AUC, that's a strong signal the fusion head is ignoring it (the scale-
    imbalance risk flagged in code review) and the forensic branch isn't
    earning its complexity.
    """
    results = {}
    for mode in ["full", "zero_visual", "zero_forensic"]:
        all_probs, all_labels = [], []
        with torch.no_grad():
            for batch in loader:
                pixel_values = batch["pixel_values"].to(device)
                forensic_features = batch["forensic_features"].to(device)
                labels = batch["label"].to(device)

                if mode == "zero_visual":
                    pixel_values = torch.zeros_like(pixel_values)
                elif mode == "zero_forensic":
                    forensic_features = torch.zeros_like(forensic_features)

                probs = model.predict_probabilities(pixel_values, forensic_features, calibrate=True)
                all_probs.extend(probs[:, 1].cpu().numpy())
                all_labels.extend(labels.cpu().numpy())

        try:
            auc = float(roc_auc_score(all_labels, all_probs))
        except ValueError:
            auc = float("nan")
        results[mode] = round(auc, 4)

    forensic_contribution = round(results["full"] - results["zero_forensic"], 4)
    visual_contribution = round(results["full"] - results["zero_visual"], 4)
    results["forensic_stream_contribution"] = forensic_contribution
    results["visual_stream_contribution"] = visual_contribution
    if abs(forensic_contribution) < 0.01:
        results["warning"] = (
            "Forensic stream contributes <0.01 AUC when ablated - it may be "
            "getting scale-drowned by the unnormalized CLIP stream. Check the "
            "LayerNorm-on-visual-stream fix."
        )
    return results


# ---------------------------------------------------------------------------
# Section 4: Robustness curve under degradation
# ---------------------------------------------------------------------------

def degrade_jpeg(img: Image.Image, quality: int) -> Image.Image:
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality)
    buf.seek(0)
    return Image.open(buf).convert("RGB")


def degrade_blur(img: Image.Image, radius: float) -> Image.Image:
    return img.filter(ImageFilter.GaussianBlur(radius=radius))


def robustness_curve(model, dataset, device, n_samples=300) -> dict:
    """
    Re-runs inference at several degradation levels using the same
    underlying images, and reports how much AUC drops. A model with a
    real forensic signal (not just semantic shortcuts) should degrade
    gracefully, not collapse to chance at moderate JPEG compression.
    """
    from model.forensic import ForensicExtractor
    forensic_extractor = ForensicExtractor()
    transform = get_transforms(is_train=False)

    n = min(n_samples, len(dataset.data))
    indices = np.random.RandomState(0).choice(len(dataset.data), n, replace=False)

    conditions = {
        "clean": lambda img: img,
        "jpeg_q70": lambda img: degrade_jpeg(img, 70),
        "jpeg_q40": lambda img: degrade_jpeg(img, 40),
        "jpeg_q20": lambda img: degrade_jpeg(img, 20),
        "blur_r1": lambda img: degrade_blur(img, 1.0),
        "blur_r2.5": lambda img: degrade_blur(img, 2.5),
    }

    results = {}
    for cond_name, cond_fn in conditions.items():
        probs, labels = [], []
        with torch.no_grad():
            for idx in indices:
                item = dataset.data[int(idx)]
                image = item.get("Image", item.get("image"))
                if not isinstance(image, Image.Image):
                    image = Image.fromarray(image)
                image = image.convert("RGB")
                label = int(item.get("Label_A", item.get("label", 0)))

                degraded = cond_fn(image)
                forensic_feats = forensic_extractor.extract_from_pil(degraded)
                pixel_tensor = transform(degraded).unsqueeze(0).to(device)
                forensic_tensor = torch.tensor(forensic_feats, dtype=torch.float32).unsqueeze(0).to(device)

                prob = model.predict_probabilities(pixel_tensor, forensic_tensor, calibrate=True)
                probs.append(float(prob[0, 1].item()))
                labels.append(label)

        try:
            auc = float(roc_auc_score(labels, probs))
        except ValueError:
            auc = float("nan")
        results[cond_name] = round(auc, 4)

    clean_auc = results.get("clean", float("nan"))
    for k in list(results.keys()):
        if k != "clean":
            results[f"{k}_drop_from_clean"] = round(clean_auc - results[k], 4)

    return results


# ---------------------------------------------------------------------------
# Section 5: Confidence distribution sanity
# ---------------------------------------------------------------------------

def confidence_distribution_check(probs) -> dict:
    confidences = np.where(probs >= 0.5, probs, 1 - probs)
    frac_over_99 = float((confidences > 0.99).mean())
    frac_near_50 = float((np.abs(confidences - 0.5) < 0.02).mean())

    warnings = []
    if frac_over_99 > 0.9:
        warnings.append(
            "Over 90% of predictions have >99% confidence - likely miscalibrated "
            "(overconfident), especially suspicious before temperature scaling is applied."
        )
    if frac_near_50 > 0.5:
        warnings.append(
            "Over 50% of predictions sit within 2% of 50/50 - model may not be "
            "learning a useful decision boundary."
        )

    return {
        "mean_confidence": round(float(confidences.mean()), 4),
        "fraction_over_99pct_confident": round(frac_over_99, 4),
        "fraction_near_toss_up": round(frac_near_50, 4),
        "warnings": warnings
    }


# ---------------------------------------------------------------------------
# Section 6: Unseen-generator check (the number that actually matters)
# ---------------------------------------------------------------------------

def unseen_generator_check(model, unseen_dir, device, batch_size=32) -> dict:
    dataset = LocalFolderDataset(unseen_dir, transform=get_transforms(is_train=False), is_train=False)
    if len(dataset) == 0:
        return {"error": f"No images found under {unseen_dir}/real or {unseen_dir}/fake"}

    loader = DataLoader(dataset, batch_size=batch_size, shuffle=False, num_workers=2)
    probs, preds, labels = collect_predictions(model, loader, device)
    metrics = compute_standard_metrics(probs, preds, labels)
    metrics["note"] = (
        "This is the metric that reflects true cross-generator generalization "
        "on unseen models (e.g. Synthbuster benchmark)."
    )
    return metrics


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def run_healthcheck(args):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Running health check on device: {device}")

    report_dir = "report/healthcheck"
    os.makedirs(report_dir, exist_ok=True)

    model = load_model(args.model_path, device)

    logger.info("Loading Defactify held-out validation pool for benchmark health check...")
    from datasets import load_dataset
    raw_test = load_dataset("Rajarshi-Roy-research/Defactify_Image_Dataset", split="validation")

    samples_per_gen = max(1, args.test_samples // 10)
    eval_indices = create_balanced_defactify_indices(raw_test, samples_per_generator=samples_per_gen, seed=99)
    test_subset = Subset(raw_test, eval_indices)
    test_dataset = DefactifyDataset(test_subset, transform=get_transforms(is_train=False), is_train=False)
    test_loader = DataLoader(test_dataset, batch_size=64, shuffle=False, num_workers=args.num_workers)

    report = {}

    logger.info("[1/6] Standard metrics on Defactify...")
    probs, preds, labels = collect_predictions(model, test_loader, device)
    report["standard_metrics_defactify"] = compute_standard_metrics(probs, preds, labels)

    logger.info("[2/6] Calibration...")
    ece_report = expected_calibration_error(probs, labels)
    report["calibration"] = ece_report
    plot_reliability_diagram(ece_report, os.path.join(report_dir, "reliability_diagram.png"))

    logger.info("[3/6] Stream-contribution ablation...")
    report["stream_ablation"] = stream_ablation_auc(model, test_loader, device)

    logger.info("[4/6] Robustness under degradation...")
    report["robustness_curve"] = robustness_curve(model, test_dataset, device, n_samples=args.robustness_samples)

    logger.info("[5/6] Confidence distribution sanity...")
    report["confidence_distribution"] = confidence_distribution_check(probs)

    if args.unseen_dir:
        logger.info(f"[6/6] Unseen-generator check against {args.unseen_dir}...")
        report["unseen_generator_metrics"] = unseen_generator_check(model, args.unseen_dir, device)
    else:
        logger.info("[6/6] Skipped - no --unseen_dir provided. "
                     "This means you have NO evidence of generalization yet.")
        report["unseen_generator_metrics"] = {
            "skipped": True,
            "warning": "No unseen-generator data provided. Defactify held-out metrics "
                       "reflect in-distribution generator performance; provide --unseen_dir "
                       "(e.g. Synthbuster) to evaluate cross-domain generalization."
        }

    report_path = os.path.join(report_dir, "healthcheck.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    logger.info(f"\n{'=' * 60}\nHEALTH CHECK SUMMARY\n{'=' * 60}")
    logger.info(json.dumps(report["standard_metrics_defactify"], indent=2))
    logger.info(f"Calibration ECE: {report['calibration']['expected_calibration_error']}")
    logger.info(f"Stream ablation: {report['stream_ablation']}")
    logger.info(f"Full report saved to: {report_path}")

    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SignalScope Model Health Check")
    parser.add_argument("--model_path", type=str, default="model/weights/best_classifier.pt")
    parser.add_argument("--test_samples", type=int, default=2000,
                         help="Number of balanced Defactify test images to evaluate")
    parser.add_argument("--robustness_samples", type=int, default=300,
                         help="Number of images to run through the degradation robustness curve")
    parser.add_argument("--unseen_dir", type=str, default=None,
                         help="Path to a folder with real/ and fake/ subfolders from generators NOT in training "
                              "(e.g. Synthbuster). This is the metric that matters most.")
    parser.add_argument("--num_workers", type=int, default=2)
    args = parser.parse_args()

    run_healthcheck(args)
