"""
SignalScope - Generator Family Attribution Head Trainer
=======================================================
Trains the lightweight auxiliary attribution head on Defactify synthetic generator subsets:
- Class 0: Stable Diffusion (SD 1.4, 1.5, 2.0)
- Class 1: Midjourney
- Class 2: DALL-E
Saves checkpoint to model/weights/attribution_head.pt and report/attribution_metrics.json
"""

import os
import sys
sys.path.insert(0, ".")
import json
import logging
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Subset
from datasets import load_dataset
from sklearn.metrics import accuracy_score, f1_score

from model.classifier import DualStreamClassifier
from model.attribution import GeneratorAttributionHead, GENERATOR_FAMILIES
from model.dataset import DefactifyDataset, create_balanced_defactify_indices, get_transforms

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("signalscope-train-attribution")


def map_generator_to_family(gen_id: int) -> int:
    """
    Maps Defactify generator IDs (1..5) to 3 primary families:
    1, 2, 3 -> 0 (Stable Diffusion)
    4       -> 1 (Midjourney)
    5       -> 2 (DALL-E)
    """
    if gen_id in [1, 2, 3]:
        return 0
    elif gen_id == 4:
        return 1
    elif gen_id == 5:
        return 2
    return 3


def train_attribution(
    epochs: int = 15,
    samples_total: int = 1500,
    save_path: str = "model/weights/attribution_head.pt",
    report_dir: str = "report"
):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    os.makedirs(report_dir, exist_ok=True)
    logger.info(f"Training generator attribution head on {device}...")

    # 1. Load Pretrained Dual-Stream Classifier (FROZEN)
    base_model = DualStreamClassifier(freeze_backbone=True).to(device)
    base_checkpoint = "model/weights/best_classifier.pt"
    if os.path.exists(base_checkpoint):
        chk = torch.load(base_checkpoint, map_location=device, weights_only=False)
        base_model.load_state_dict(chk.get("model_state_dict", chk), strict=False)
        logger.info(f"Loaded frozen base model from {base_checkpoint}")
    base_model.eval()

    # 2. Load Defactify Dataset
    logger.info("Loading Defactify validation split for attribution head training...")
    raw_dataset = load_dataset("Rajarshi-Roy-research/Defactify_Image_Dataset", split="validation")
    eval_indices = create_balanced_defactify_indices(raw_dataset, samples_per_generator=samples_total // 5, seed=42)

    # Filter to only synthetic samples (Label_A == 1, Label_B in 1..5)
    synthetic_indices = []
    synthetic_targets = []
    for idx in eval_indices:
        item = raw_dataset[int(idx)]
        lbl = int(item.get("Label_A", item.get("label", 0)))
        gen_id = int(item.get("Label_B", item.get("generator_label", 0)))
        if lbl == 1 and gen_id > 0:
            synthetic_indices.append(idx)
            synthetic_targets.append(map_generator_to_family(gen_id))

    synthetic_indices = np.array(synthetic_indices)
    synthetic_targets = np.array(synthetic_targets)
    logger.info(f"Filtered {len(synthetic_indices)} synthetic samples across generator families.")

    # Train/Val Split (80/20)
    rng = np.random.RandomState(42)
    perm = rng.permutation(len(synthetic_indices))
    val_count = int(len(synthetic_indices) * 0.20)

    train_idx = synthetic_indices[perm[val_count:]]
    train_y = synthetic_targets[perm[val_count:]]
    val_idx = synthetic_indices[perm[:val_count]]
    val_y = synthetic_targets[perm[:val_count]]

    # 3. Extract and Cache Fused Embeddings (Offline Feature Extraction for extreme speed)
    def extract_features(indices):
        subset = Subset(raw_dataset, indices)
        ds = DefactifyDataset(subset, transform=get_transforms(is_train=False), is_train=False)
        loader = DataLoader(ds, batch_size=64, shuffle=False, num_workers=0)
        feats = []
        with torch.no_grad():
            for batch in loader:
                pix = batch["pixel_values"].to(device)
                for_feat = batch["forensic_features"].to(device)
                vis_out = base_model.vision_encoder(pixel_values=pix)
                vis_emb = base_model.visual_norm(vis_out.image_embeds)
                for_emb = base_model.forensic_proj(for_feat)
                fused = torch.cat([vis_emb, for_emb], dim=-1)
                feats.append(fused.cpu())
        return torch.cat(feats, dim=0)

    logger.info("Extracting fused embeddings for training...")
    train_x = extract_features(train_idx)
    logger.info("Extracting fused embeddings for validation...")
    val_x = extract_features(val_idx)

    # 4. Train Attribution Head
    head = GeneratorAttributionHead(in_features=640, num_families=4).to(device)
    optimizer = torch.optim.AdamW(head.parameters(), lr=1e-3, weight_decay=1e-4)
    criterion = nn.CrossEntropyLoss()

    train_tensor_y = torch.tensor(train_y, dtype=torch.long)
    val_tensor_y = torch.tensor(val_y, dtype=torch.long)

    best_val_acc = 0.0
    best_state = None

    for epoch in range(1, epochs + 1):
        head.train()
        # Shuffle batches
        batch_size = 32
        perm_epoch = torch.randperm(len(train_x))
        epoch_loss = 0.0

        for b in range(0, len(train_x), batch_size):
            b_idx = perm_epoch[b:b + batch_size]
            bx = train_x[b_idx].to(device)
            by = train_tensor_y[b_idx].to(device)

            optimizer.zero_grad()
            logits = head(bx)
            loss = criterion(logits, by)
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item()

        # Validation
        head.eval()
        with torch.no_grad():
            val_logits = head(val_x.to(device))
            val_preds = val_logits.argmax(dim=-1).cpu().numpy()
            val_acc = accuracy_score(val_y, val_preds)
            val_f1 = f1_score(val_y, val_preds, average="macro", zero_division=0)

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_state = head.state_dict()

        if epoch % 5 == 0 or epoch == epochs:
            logger.info(f"Epoch {epoch:2d}/{epochs} - Loss: {epoch_loss:.4f} - Val Acc: {val_acc*100:.1f}% - Macro-F1: {val_f1:.4f}")

    # Save Best Weights
    torch.save({"state_dict": best_state, "val_acc": best_val_acc}, save_path)
    logger.info(f"Saved best attribution head (Val Acc: {best_val_acc*100:.1f}%) to {save_path}")

    # Metrics Summary
    report_data = {
        "multi_class_task": "Generator Family Attribution (Bonus Track B)",
        "families": GENERATOR_FAMILIES,
        "best_validation_accuracy": round(float(best_val_acc), 4),
        "total_synthetic_samples": len(synthetic_indices),
        "validation_samples": len(val_idx)
    }
    json_path = os.path.join(report_dir, "attribution_metrics.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(report_data, f, indent=2)
    logger.info(f"Saved attribution metrics to {json_path}")

    return report_data


if __name__ == "__main__":
    train_attribution()
