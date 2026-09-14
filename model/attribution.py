"""
SignalScope - Generator Family Attribution Head (Bonus Track B)
================================================================
Implements multi-class generator family attribution conforming to SIH §3.2:
Given an AI-generated image, predicts the probable generator family:
- Class 0: Stable Diffusion family (v1.4, v1.5, v2.0, SDXL)
- Class 1: Midjourney family
- Class 2: DALL-E family
- Class 3: GAN / Other Generative Models

Operates on the frozen 640-d fused embeddings of DualStreamClassifier.
Ensures ZERO regression risk on the core binary classifier.
"""

import os
import sys
sys.path.insert(0, ".")
import json
import logging
from typing import Dict, Any, Union, Optional
import numpy as np
import torch
import torch.nn as nn
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("signalscope-attribution")

GENERATOR_FAMILIES = [
    "Stable Diffusion family (SD 1.x / 2.x / SDXL)",
    "Midjourney family (v5 / v6)",
    "DALL-E family (DALL-E 2 / 3)",
    "GAN / Legacy Generative Models"
]


class GeneratorAttributionHead(nn.Module):
    """
    Auxiliary multi-class classification head operating on frozen 640-d fused embeddings.
    """

    def __init__(self, in_features: int = 640, num_families: int = 4):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_features, 128),
            nn.LayerNorm(128),
            nn.GELU(),
            nn.Dropout(0.2),
            nn.Linear(128, 64),
            nn.GELU(),
            nn.Dropout(0.1),
            nn.Linear(64, num_families)
        )

    def forward(self, fused_features: torch.Tensor) -> torch.Tensor:
        return self.net(fused_features)


class GeneratorAttributionPredictor:
    """
    Inference wrapper for generator family attribution.
    """

    def __init__(
        self,
        classifier_instance,
        weights_path: str = "model/weights/attribution_head.pt"
    ):
        self.classifier = classifier_instance
        self.device = classifier_instance.device
        self.weights_path = weights_path
        self.head = GeneratorAttributionHead().to(self.device)
        self.is_loaded = False
        self._load_weights()

    def _load_weights(self):
        if os.path.exists(self.weights_path):
            state = torch.load(self.weights_path, map_location=self.device, weights_only=False)
            self.head.load_state_dict(state.get("state_dict", state))
            self.head.eval()
            self.is_loaded = True
            logger.info(f"Loaded generator attribution weights from {self.weights_path}")
        else:
            logger.info(f"No attribution weights found at {self.weights_path}. Running with prior weights.")
            self.head.eval()

    def predict_family(self, image: Image.Image, fused_features: Optional[torch.Tensor] = None) -> Dict[str, Any]:
        """
        Predicts generator family for an image.
        Accepts optional pre-computed fused_features (640-d) to eliminate redundant CLIP + forensic computation.
        Returns:
            {
                "predicted_family": str,
                "confidence": float,
                "distribution": {family_name: prob, ...}
            }
        """
        with torch.no_grad():
            if fused_features is None:
                pixel_tensor = self.classifier.transform(image).unsqueeze(0).to(self.device)
                forensic_feats = self.classifier.forensic_extractor.extract_from_pil(image)
                forensic_tensor = torch.tensor(forensic_feats, dtype=torch.float32).unsqueeze(0).to(self.device)

                vision_outputs = self.classifier.model.vision_encoder(pixel_values=pixel_tensor)
                visual_embeds = self.classifier.model.visual_norm(vision_outputs.image_embeds)
                forensic_embeds = self.classifier.model.forensic_proj(forensic_tensor)
                fused = torch.cat([visual_embeds, forensic_embeds], dim=-1)
            else:
                fused = fused_features.to(self.device)

            logits = self.head(fused)
            probs = torch.softmax(logits, dim=-1)[0].cpu().numpy()

        pred_idx = int(np.argmax(probs))
        dist = {GENERATOR_FAMILIES[i]: round(float(probs[i]), 4) for i in range(len(GENERATOR_FAMILIES))}

        return {
            "predicted_family": GENERATOR_FAMILIES[pred_idx],
            "confidence": round(float(probs[pred_idx]), 4),
            "distribution": dist,
            "family_probabilities": dist
        }
