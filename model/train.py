"""
SignalScope - Core Classifier Training & Confidence Calibration
================================================================
Trains the DualStreamClassifier on Defactify (MS COCO natural photos vs 5 modern diffusion generators):
- Frozen CLIP ViT-B/16 Vision Stream + Trainable Forensic Projection & Fusion Head
- Mixed Precision (FP16 / PyTorch AMP)
- Cross-Entropy Loss with Label Smoothing
- Temperature Scaling for Calibrated Probabilities (SIH Scoring Rubric Requirement)
- Saves best checkpoints to model/weights/best_classifier.pt and .safetensors
"""

import os
import sys
# Ensure project root is in sys.path when script is executed directly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import argparse
import logging
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Subset
from datasets import load_dataset
from tqdm import tqdm
from sklearn.metrics import roc_auc_score, f1_score, accuracy_score
from safetensors.torch import save_model

from model.classifier import DualStreamClassifier
from model.dataset import DefactifyDataset, create_balanced_defactify_indices, get_transforms

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("signalscope-train")


def calibrate_temperature(
    model: DualStreamClassifier,
    val_loader: DataLoader,
    device: torch.device,
    max_iters: int = 50
) -> float:
    """
    Optimizes the TemperatureScaler parameter (T) on the validation set
    using Negative Log-Likelihood (NLL) via L-BFGS.
    """
    logger.info("Starting Temperature Scaling calibration...")
    model.eval()

    logits_list = []
    labels_list = []

    with torch.no_grad():
        for batch in val_loader:
            pixel_values = batch["pixel_values"].to(device)
            forensic_features = batch["forensic_features"].to(device)
            labels = batch["label"].to(device)

            logits = model(pixel_values, forensic_features)
            logits_list.append(logits)
            labels_list.append(labels)

    logits_all = torch.cat(logits_list, dim=0)
    labels_all = torch.cat(labels_list, dim=0)

    nll_criterion = nn.CrossEntropyLoss()

    # Optimize only the temperature parameter
    optimizer = torch.optim.LBFGS([model.scaler.temperature], lr=0.01, max_iter=max_iters)

    def eval_loss():
        optimizer.zero_grad()
        scaled_logits = model.scaler(logits_all)
        loss = nll_criterion(scaled_logits, labels_all)
        loss.backward()
        return loss

    optimizer.step(eval_loss)
    learned_t = float(model.scaler.temperature.item())
    logger.info(f"Calibration complete! Learned Temperature: {learned_t:.4f}")
    return learned_t


def evaluate(
    model: DualStreamClassifier,
    val_loader: DataLoader,
    device: torch.device
) -> dict:
    """Evaluates ROC-AUC, Macro-F1, and Accuracy on validation set."""
    model.eval()
    all_probs = []
    all_labels = []
    all_preds = []

    with torch.no_grad():
        for batch in val_loader:
            pixel_values = batch["pixel_values"].to(device)
            forensic_features = batch["forensic_features"].to(device)
            labels = batch["label"].to(device)

            probs = model.predict_probabilities(pixel_values, forensic_features, calibrate=True)
            fake_probs = probs[:, 1].cpu().numpy()
            preds = probs.argmax(dim=-1).cpu().numpy()

            all_probs.extend(fake_probs)
            all_labels.extend(labels.cpu().numpy())
            all_preds.extend(preds)

    all_probs = np.array(all_probs)
    all_labels = np.array(all_labels)
    all_preds = np.array(all_preds)

    auc = float(roc_auc_score(all_labels, all_probs))
    f1 = float(f1_score(all_labels, all_preds, average="macro"))
    acc = float(accuracy_score(all_labels, all_preds))

    return {
        "roc_auc": auc,
        "macro_f1": f1,
        "accuracy": acc
    }


def train(args):
    device = torch.device("cuda" if torch.cuda.is_available() and not args.cpu else "cpu")
    logger.info(f"Training on device: {device}")

    weights_dir = args.weights_dir
    os.makedirs(weights_dir, exist_ok=True)

    # 1. Load Dataset
    logger.info(f"Loading dataset: {args.dataset_name}...")
    raw_dataset = load_dataset(args.dataset_name)

    train_data = raw_dataset["train"]
    val_data = raw_dataset["validation"]

    # Each synthetic generator receives subset_size // 10 samples (5 generators * quota = 50% synthetic)
    # Remaining 50% is real photography (MS COCO) to achieve exact 50/50 class balance
    samples_per_gen_train = max(1, args.subset_size // 10) if args.subset_size else 2000
    samples_per_gen_val = max(1, args.val_subset_size // 10) if args.val_subset_size else 300

    logger.info(f"Generating balanced training indices ({samples_per_gen_train} per generator, seed={args.seed})...")
    train_indices = create_balanced_defactify_indices(
        train_data, samples_per_generator=samples_per_gen_train, seed=args.seed
    )
    train_subset = Subset(train_data, train_indices)

    logger.info(f"Generating balanced validation indices ({samples_per_gen_val} per generator, seed={args.seed})...")
    val_indices = create_balanced_defactify_indices(
        val_data, samples_per_generator=samples_per_gen_val, seed=args.seed
    )
    val_subset = Subset(val_data, val_indices)

    train_dataset = DefactifyDataset(train_subset, transform=get_transforms(is_train=True), is_train=True)
    val_dataset = DefactifyDataset(val_subset, transform=get_transforms(is_train=False), is_train=False)

    train_loader = DataLoader(
        train_dataset,
        batch_size=args.batch_size,
        shuffle=True,
        num_workers=args.num_workers,
        pin_memory=(device.type == "cuda")
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=args.num_workers,
        pin_memory=(device.type == "cuda")
    )

    logger.info(f"Train samples: {len(train_dataset)}, Validation samples: {len(val_dataset)}")

    # 2. Instantiate Model
    model = DualStreamClassifier(freeze_backbone=True).to(device)

    # Only optimize trainable parameters (forensic projection + classification head)
    trainable_params = [p for p in model.parameters() if p.requires_grad]
    logger.info(f"Trainable parameters: {sum(p.numel() for p in trainable_params):,}")

    optimizer = torch.optim.AdamW(trainable_params, lr=args.lr, weight_decay=1e-2)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs, eta_min=1e-6)
    criterion = nn.CrossEntropyLoss(label_smoothing=0.05)
    scaler = torch.amp.GradScaler('cuda', enabled=(device.type == "cuda"))

    best_auc = 0.0
    best_model_path = os.path.join(weights_dir, "best_classifier.pt")
    best_safetensors_path = os.path.join(weights_dir, "best_classifier.safetensors")

    # 3. Training Loop
    for epoch in range(1, args.epochs + 1):
        model.train()
        total_loss = 0.0
        num_batches = 0

        pbar = tqdm(train_loader, desc=f"Epoch {epoch}/{args.epochs}")
        for batch in pbar:
            pixel_values = batch["pixel_values"].to(device)
            forensic_features = batch["forensic_features"].to(device)
            labels = batch["label"].to(device)

            optimizer.zero_grad()

            with torch.amp.autocast('cuda', enabled=(device.type == "cuda")):
                logits = model(pixel_values, forensic_features)
                loss = criterion(logits, labels)

            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()

            total_loss += loss.item()
            num_batches += 1
            pbar.set_postfix({"loss": f"{total_loss / num_batches:.4f}"})

        scheduler.step()
        avg_loss = total_loss / max(num_batches, 1)

        # 4. Epoch Evaluation
        metrics = evaluate(model, val_loader, device)
        logger.info(
            f"Epoch {epoch} Results | Loss: {avg_loss:.4f} | "
            f"ROC-AUC: {metrics['roc_auc']:.4f} | "
            f"Macro-F1: {metrics['macro_f1']:.4f} | "
            f"Accuracy: {metrics['accuracy']:.4f}"
        )

        if metrics["roc_auc"] > best_auc:
            best_auc = metrics["roc_auc"]
            logger.info(f"New best ROC-AUC: {best_auc:.4f}! Saving checkpoint...")
            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "metrics": metrics,
                "temperature": model.scaler.temperature.item()
            }, best_model_path)

            try:
                save_model(model, best_safetensors_path)
            except Exception as e:
                logger.warning(f"Could not save safetensors: {e}")

    # 5. Post-Training Confidence Calibration
    best_checkpoint = {}
    if os.path.exists(best_model_path):
        best_checkpoint = torch.load(best_model_path, map_location=device, weights_only=False)
        missing, unexpected = model.load_state_dict(best_checkpoint["model_state_dict"], strict=False)
        critical_missing = [k for k in missing if "vision_encoder" not in k]
        if critical_missing:
            raise RuntimeError(f"Critical keys missing from checkpoint: {critical_missing}")

    learned_t = calibrate_temperature(model, val_loader, device)
    
    # Save calibrated checkpoint (.pt) preserving full training metadata
    save_dict = {
        "model_state_dict": model.state_dict(),
        "temperature": learned_t,
        "best_auc": best_auc,
        "epoch": best_checkpoint.get("epoch", args.epochs),
        "metrics": best_checkpoint.get("metrics", {}),
        "optimizer_state_dict": best_checkpoint.get("optimizer_state_dict", {})
    }
    torch.save(save_dict, best_model_path)
    logger.info(f"Model saved and calibrated to {best_model_path}")

    # Save calibrated checkpoint (.safetensors)
    try:
        save_model(model, best_safetensors_path)
        logger.info(f"Model saved and calibrated to {best_safetensors_path}")
    except Exception as e:
        logger.warning(f"Could not save safetensors: {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train SignalScope Dual-Stream Classifier on Defactify")
    parser.add_argument("--epochs", type=int, default=3, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=64, help="Batch size for training")
    parser.add_argument("--lr", type=float, default=3e-4, help="Learning rate")
    parser.add_argument("--subset_size", type=int, default=20000, help="Total training samples (balanced 50/50 across generators)")
    parser.add_argument("--val_subset_size", type=int, default=3000, help="Total validation samples (balanced 50/50 across generators)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for deterministic data splitting")
    parser.add_argument("--weights_dir", type=str, default="model/weights", help="Directory where model weights are saved")
    parser.add_argument("--dataset_name", type=str, default="Rajarshi-Roy-research/Defactify_Image_Dataset", help="Hugging Face dataset identifier")
    parser.add_argument("--num_workers", type=int, default=2, help="Number of DataLoader worker processes")
    parser.add_argument("--cpu", action="store_true", help="Force CPU training")

    args = parser.parse_args()
    train(args)
