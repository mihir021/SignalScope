"""
SignalScope - Comprehensive Model Evaluation & Report Generation
=================================================================
Evaluates the trained DualStreamClassifier and generates required SIH artifacts:
- ROC-AUC Curve (Primary Metric)
- Confusion Matrix Plot (report/confusion_matrix.png)
- ROC Curve Plot (report/roc_curve.png)
- Full Metrics Summary (report/metrics.json)
"""

import os
import sys
# Ensure project root is in sys.path when script is executed directly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import json
import argparse
import logging
import numpy as np
import matplotlib.pyplot as plt
from typing import Optional
import torch
from torch.utils.data import DataLoader, Subset
from datasets import load_dataset
from sklearn.metrics import (
    roc_auc_score,
    roc_curve,
    f1_score,
    accuracy_score,
    confusion_matrix,
    precision_score,
    recall_score
)

from model.classifier import DualStreamClassifier
from model.dataset import DefactifyDataset, LocalFolderDataset, create_balanced_defactify_indices, get_transforms

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("signalscope-evaluate")


def run_evaluation(
    model_path: str = "model/weights/best_classifier.pt",
    test_samples: int = 2000,
    data_path: Optional[str] = None,
    report_dir: str = "report",
    num_workers: int = 2
):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Running evaluation using device: {device}")

    os.makedirs(report_dir, exist_ok=True)

    # 1. Load Model
    model = DualStreamClassifier(freeze_backbone=True).to(device)
    if os.path.exists(model_path):
        checkpoint = torch.load(model_path, map_location=device, weights_only=False)
        state_dict = checkpoint.get("model_state_dict", checkpoint)
        missing, unexpected = model.load_state_dict(state_dict, strict=False)
        critical_missing = [k for k in missing if "vision_encoder" not in k]
        if critical_missing:
            raise RuntimeError(f"Critical keys missing in checkpoint: {critical_missing}")
        logger.info(f"Loaded trained checkpoint from {model_path}")
    else:
        logger.warning(f"No checkpoint found at {model_path}! Evaluating with initialized weights.")

    model.eval()

    # 2. Load Evaluation Dataset
    if data_path and os.path.isdir(data_path):
        logger.info(f"Loading local evaluation dataset from {data_path}...")
        test_dataset = LocalFolderDataset(data_path, transform=get_transforms(is_train=False), is_train=False)
    else:
        logger.info("Loading Defactify validation split for held-out benchmark evaluation...")
        raw_dataset = load_dataset("Rajarshi-Roy-research/Defactify_Image_Dataset", split="validation")
        samples_per_gen = max(1, test_samples // 10)
        eval_indices = create_balanced_defactify_indices(raw_dataset, samples_per_generator=samples_per_gen, seed=99)
        test_subset = Subset(raw_dataset, eval_indices)
        test_dataset = DefactifyDataset(test_subset, transform=get_transforms(is_train=False), is_train=False)

    test_loader = DataLoader(test_dataset, batch_size=64, shuffle=False, num_workers=num_workers)

    # 3. Collect Predictions
    all_probs = []
    all_preds = []
    all_labels = []

    with torch.no_grad():
        for batch in test_loader:
            pixel_values = batch["pixel_values"].to(device)
            forensic_features = batch["forensic_features"].to(device)
            labels = batch["label"].to(device)

            probs = model.predict_probabilities(pixel_values, forensic_features, calibrate=True)
            fake_probs = probs[:, 1].cpu().numpy()
            preds = probs.argmax(dim=-1).cpu().numpy()

            all_probs.extend(fake_probs)
            all_preds.extend(preds)
            all_labels.extend(labels.cpu().numpy())

    all_probs = np.array(all_probs)
    all_preds = np.array(all_preds)
    all_labels = np.array(all_labels)

    # 4. Compute Standard Metrics
    try:
        auc = float(roc_auc_score(all_labels, all_probs))
    except ValueError:
        auc = float("nan")
    macro_f1 = float(f1_score(all_labels, all_preds, average="macro"))
    acc = float(accuracy_score(all_labels, all_preds))
    precision = float(precision_score(all_labels, all_preds, zero_division=0))
    recall = float(recall_score(all_labels, all_preds, zero_division=0))

    cm = confusion_matrix(all_labels, all_preds, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel()
    fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0

    metrics_summary = {
        "roc_auc": round(auc, 4),
        "macro_f1": round(macro_f1, 4),
        "accuracy": round(acc, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "false_positive_rate": round(fpr, 4),
        "test_samples_evaluated": len(all_labels),
        "confusion_matrix": {
            "true_negatives_real": int(tn),
            "false_positives": int(fp),
            "false_negatives": int(fn),
            "true_positives_ai": int(tp)
        }
    }

    logger.info(f"Evaluation Metrics:\n{json.dumps(metrics_summary, indent=2)}")

    # 5. Save metrics.json
    metrics_path = os.path.join(report_dir, "metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics_summary, f, indent=2)

    # 6. Plot & Save Confusion Matrix
    plt.figure(figsize=(6, 5))
    plt.imshow(cm, interpolation="nearest", cmap=plt.cm.Blues)
    plt.title("SignalScope - Confusion Matrix")
    plt.colorbar()
    tick_marks = np.arange(2)
    plt.xticks(tick_marks, ["REAL", "AI"], rotation=45)
    plt.yticks(tick_marks, ["REAL", "AI"])

    thresh = cm.max() / 2.0
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            plt.text(
                j, i, format(cm[i, j], "d"),
                ha="center", va="center",
                color="white" if cm[i, j] > thresh else "black"
            )

    plt.ylabel("Ground Truth")
    plt.xlabel("Predicted Label")
    plt.tight_layout()
    cm_path = os.path.join(report_dir, "confusion_matrix.png")
    plt.savefig(cm_path, dpi=200)
    plt.close()

    # 7. Plot & Save ROC Curve (if both classes are present)
    try:
        fpr_curve, tpr_curve, _ = roc_curve(all_labels, all_probs)
        plt.figure(figsize=(6, 5))
        plt.plot(fpr_curve, tpr_curve, color="darkorange", lw=2, label=f"ROC curve (AUC = {auc:.4f})")
        plt.plot([0, 1], [0, 1], color="navy", lw=1.5, linestyle="--")
        plt.xlim([0.0, 1.0])
        plt.ylim([0.0, 1.05])
        plt.xlabel("False Positive Rate")
        plt.ylabel("True Positive Rate")
        plt.title("SignalScope - ROC Characteristic")
        plt.legend(loc="lower right")
        plt.grid(alpha=0.3)
        plt.tight_layout()
        roc_path = os.path.join(report_dir, "roc_curve.png")
        plt.savefig(roc_path, dpi=200)
        plt.close()
    except Exception as e:
        logger.warning(f"Could not generate ROC curve plot (single class or constant probabilities): {e}")

    logger.info(f"Artifacts successfully saved to {report_dir}/ (metrics.json, confusion_matrix.png, roc_curve.png)")
    return metrics_summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate SignalScope Classifier on Defactify or Local Dataset")
    parser.add_argument("--model_path", type=str, default="model/weights/best_classifier.pt")
    parser.add_argument("--test_samples", type=int, default=2000, help="Number of balanced test samples to evaluate")
    parser.add_argument("--data_path", type=str, default=None, help="Optional local directory (e.g. data/synthbuster) for evaluation")
    parser.add_argument("--report_dir", type=str, default="report", help="Destination folder for evaluation artifacts")
    parser.add_argument("--num_workers", type=int, default=2, help="Number of DataLoader workers")
    args = parser.parse_args()

    run_evaluation(args.model_path, args.test_samples, args.data_path, args.report_dir, args.num_workers)
