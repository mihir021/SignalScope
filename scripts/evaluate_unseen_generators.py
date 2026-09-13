"""
SignalScope - Unseen Generator Evaluation Suite (SIH Tie-Breaker #1)
===================================================================
Evaluates model generalization across generator families:
- Discloses per-generator detection recall
- Computes Overall Held-out ROC-AUC
- Computes Unseen-Generator Split ROC-AUC (generators 4 & 5: Midjourney and DALL-E)
- Generates structured JSON report and breakdown bar chart in report/
"""

import os
import sys
sys.path.insert(0, ".")
import json
import logging
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import torch
from torch.utils.data import DataLoader, Subset
from datasets import load_dataset
from sklearn.metrics import roc_auc_score, f1_score, accuracy_score, confusion_matrix

from model.classifier import DualStreamClassifier
from model.dataset import DefactifyDataset, create_balanced_defactify_indices, get_transforms
from model.splits import assert_generator_disjoint

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("signalscope-unseen-eval")

GENERATOR_NAMES = {
    0: "Real Photos (COCO)",
    1: "Stable Diffusion v1.4",
    2: "Stable Diffusion v1.5",
    3: "Stable Diffusion v2.0",
    4: "Midjourney (Unseen)",
    5: "DALL-E (Unseen)"
}


def evaluate_unseen_split(
    model_path: str = "model/weights/best_classifier.pt",
    test_samples: int = 1200,
    unseen_gen_ids: list = [4, 5],
    report_dir: str = "report"
):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    os.makedirs(report_dir, exist_ok=True)
    logger.info(f"Using device: {device}")

    # 1. Load Model
    model = DualStreamClassifier(freeze_backbone=True).to(device)
    if os.path.exists(model_path):
        checkpoint = torch.load(model_path, map_location=device, weights_only=False)
        state_dict = checkpoint.get("model_state_dict", checkpoint)
        model.load_state_dict(state_dict, strict=False)
        logger.info(f"Loaded trained checkpoint from {model_path}")
    else:
        logger.warning(f"No checkpoint found at {model_path}!")

    model.eval()

    # 2. Load Evaluation Dataset
    logger.info("Loading Defactify validation split for generator-stratified evaluation...")
    raw_dataset = load_dataset("Rajarshi-Roy-research/Defactify_Image_Dataset", split="validation")
    samples_per_gen = max(1, test_samples // 10)
    eval_indices = create_balanced_defactify_indices(raw_dataset, samples_per_generator=samples_per_gen, seed=99)
    test_subset = Subset(raw_dataset, eval_indices)
    test_dataset = DefactifyDataset(test_subset, transform=get_transforms(is_train=False), is_train=False)

    test_loader = DataLoader(test_dataset, batch_size=64, shuffle=False, num_workers=0)

    # 3. Collect Predictions with Generator Tags
    all_probs = []
    all_preds = []
    all_labels = []
    all_gen_ids = []

    with torch.no_grad():
        for batch in test_loader:
            pixel_values = batch["pixel_values"].to(device)
            forensic_features = batch["forensic_features"].to(device)
            labels = batch["label"].to(device)
            gen_labels = batch["generator_label"].to(device)

            probs = model.predict_probabilities(pixel_values, forensic_features, calibrate=True)
            fake_probs = probs[:, 1].cpu().numpy()
            preds = probs.argmax(dim=-1).cpu().numpy()

            all_probs.extend(fake_probs)
            all_preds.extend(preds)
            all_labels.extend(labels.cpu().numpy())
            all_gen_ids.extend(gen_labels.cpu().numpy())

    all_probs = np.array(all_probs)
    all_preds = np.array(all_preds)
    all_labels = np.array(all_labels)
    all_gen_ids = np.array(all_gen_ids)

    # 4. Metrics: Overall
    overall_auc = float(roc_auc_score(all_labels, all_probs))
    overall_f1 = float(f1_score(all_labels, all_preds, average="macro"))
    overall_acc = float(accuracy_score(all_labels, all_preds))

    # 5. Metrics: Unseen Generator Split (Tie-Breaker #1)
    # Subset: All real photos (gen_id == 0) + synthetic from unseen generators (gen_id in unseen_gen_ids)
    unseen_mask = (all_gen_ids == 0) | np.isin(all_gen_ids, unseen_gen_ids)
    unseen_probs = all_probs[unseen_mask]
    unseen_labels = all_labels[unseen_mask]
    unseen_preds = all_preds[unseen_mask]

    unseen_auc = float(roc_auc_score(unseen_labels, unseen_probs))
    unseen_f1 = float(f1_score(unseen_labels, unseen_preds, average="macro"))
    unseen_acc = float(accuracy_score(unseen_labels, unseen_preds))

    # 6. Metrics: Per-Generator Breakdown
    per_gen_metrics = {}
    for gen_id, gen_name in GENERATOR_NAMES.items():
        gen_mask = (all_gen_ids == gen_id)
        if not np.any(gen_mask):
            continue
        gen_count = int(np.sum(gen_mask))
        if gen_id == 0:
            # For real photos, metric is correct rejection rate (specificity)
            gen_acc = float(np.mean(all_preds[gen_mask] == 0))
            metric_type = "specificity_real_rejection"
        else:
            # For AI generators, metric is recall (detection rate)
            gen_acc = float(np.mean(all_preds[gen_mask] == 1))
            metric_type = "detection_recall"

        per_gen_metrics[gen_name] = {
            "generator_id": int(gen_id),
            "sample_count": gen_count,
            "metric_type": metric_type,
            "score": round(gen_acc, 4),
            "is_unseen": bool(gen_id in unseen_gen_ids)
        }

    report_data = {
        "overall_roc_auc": round(overall_auc, 4),
        "overall_macro_f1": round(overall_f1, 4),
        "overall_accuracy": round(overall_acc, 4),
        "unseen_split_roc_auc": round(unseen_auc, 4),
        "unseen_split_macro_f1": round(unseen_f1, 4),
        "unseen_split_accuracy": round(unseen_acc, 4),
        "tie_breaker_unseen_auc": round(unseen_auc, 4),
        "unseen_generators_evaluated": [GENERATOR_NAMES[g] for g in unseen_gen_ids],
        "per_generator_breakdown": per_gen_metrics,
        "total_samples_evaluated": len(all_labels)
    }

    # Save JSON Report
    json_path = os.path.join(report_dir, "unseen_generator_metrics.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(report_data, f, indent=2)
    logger.info(f"Saved unseen generator metrics to: {json_path}")

    # Generate Comparative Bar Chart
    names = list(per_gen_metrics.keys())
    scores = [per_gen_metrics[k]["score"] * 100 for k in names]
    colors = ["#2ecc71" if k.startswith("Real") else ("#e67e22" if "Unseen" in k else "#3498db") for k in names]

    fig, ax = plt.subplots(figsize=(12, 6))
    bars = ax.bar(names, scores, color=colors, width=0.55, edgecolor="black", linewidth=1.2)
    ax.set_ylim(0, 105)
    ax.set_ylabel("Detection Recall / Accuracy (%)", fontsize=12, fontweight="bold")
    ax.set_title(
        f"SignalScope Generator-Stratified Generalization Breakdown\n"
        f"Overall AUC: {overall_auc:.4f} | Unseen-Split AUC (Tie-Breaker #1): {unseen_auc:.4f}",
        fontsize=13,
        fontweight="bold"
    )
    ax.axhline(95, color="gray", linestyle="--", alpha=0.6, label="95% Target Performance Band")

    for bar in bars:
        h = bar.get_height()
        ax.text(bar.get_x() + bar.get_width() / 2.0, h + 1.5, f"{h:.1f}%", ha="center", va="bottom", fontweight="bold", fontsize=11)

    plt.xticks(rotation=15, ha="right", fontsize=10, fontweight="bold")
    plt.legend(loc="lower right")
    plt.tight_layout()

    plot_path = os.path.join(report_dir, "unseen_generator_breakdown.png")
    plt.savefig(plot_path, dpi=150)
    plt.close()
    logger.info(f"Saved generator breakdown plot to: {plot_path}")

    return report_data


if __name__ == "__main__":
    report = evaluate_unseen_split()
    print("\n" + "=" * 60)
    print("UNSEEN GENERATOR EVALUATION COMPLETE (SIH TIE-BREAKER #1)")
    print("=" * 60)
    print(f"Overall Held-out ROC-AUC:      {report['overall_roc_auc']:.4f}")
    print(f"Unseen Split ROC-AUC:          {report['unseen_split_roc_auc']:.4f}")
    print(f"Unseen Split Macro-F1:         {report['unseen_split_macro_f1']:.4f}")
    print("-" * 60)
    print("Per-Generator Detection Recall:")
    for gen, d in report["per_generator_breakdown"].items():
        tag = "[UNSEEN]" if d["is_unseen"] else "[SEEN]"
        print(f"  {gen:30s} {tag} -> {d['score']*100:.1f}% ({d['sample_count']} samples)")
    print("=" * 60)
