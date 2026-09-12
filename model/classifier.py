"""
SignalScope - Dual-Stream Core Classifier
==========================================
Combines:
1. Vision Backbone: CLIP ViT-B/16 (Semantic & Visual feature stream, 512-d)
2. Forensic Branch: 2D-FFT Azimuthal spectrum + Noise residual moments (128-d)
3. Calibrated Fusion Head: Multi-layer perceptron with Temperature Scaling

Labels:
- 0: "real"
- 1: "fake"
"""

import torch
import torch.nn as nn
from transformers import CLIPVisionModelWithProjection, CLIPImageProcessor
from typing import Dict, Any, Optional, Tuple
from PIL import Image

from model.forensic import ForensicExtractor


class TemperatureScaler(nn.Module):
    """
    Applies Platt / Temperature Scaling to calibrate confidence probabilities.
    Logits are divided by a learned positive scalar T.
    """

    def __init__(self):
        super().__init__()
        self.temperature = nn.Parameter(torch.ones(1) * 1.0)

    def forward(self, logits: torch.Tensor) -> torch.Tensor:
        # Clamp temperature to avoid division by zero or logit explosion
        temp = torch.clamp(self.temperature, min=0.01, max=10.0)
        return logits / temp


class DualStreamClassifier(nn.Module):
    """
    Core SignalScope Dual-Stream Classifier.
    Fuses semantic representations from CLIP ViT-B/16 with frequency & noise forensic features.
    """

    def __init__(
        self,
        clip_model_name: str = "openai/clip-vit-base-patch16",
        forensic_dim: int = 128,
        num_classes: int = 2,
        freeze_backbone: bool = True
    ):
        super().__init__()
        self.clip_model_name = clip_model_name
        self.forensic_dim = forensic_dim
        self.num_classes = num_classes

        # 1. Forensic Feature Extractor
        self.forensic_extractor = ForensicExtractor(fft_bins=64, noise_dims=64)

        # 2. CLIP ViT-B/16 Vision Backbone
        self.vision_encoder = CLIPVisionModelWithProjection.from_pretrained(clip_model_name)
        clip_feature_dim = self.vision_encoder.config.projection_dim  # 512 for ViT-B/16

        if freeze_backbone:
            for param in self.vision_encoder.parameters():
                param.requires_grad = False

        # Visual Stream LayerNorm to standardize scale with forensic stream (prevents scale drowning)
        self.visual_norm = nn.LayerNorm(clip_feature_dim)

        # 3. Forensic Projection Stream
        self.forensic_proj = nn.Sequential(
            nn.Linear(forensic_dim, 128),
            nn.LayerNorm(128),
            nn.GELU(),
            nn.Dropout(0.2)
        )

        # 4. Multimodal Fusion Head (512 + 128 = 640 dims)
        fused_dim = clip_feature_dim + 128
        self.classifier_head = nn.Sequential(
            nn.Linear(fused_dim, 256),
            nn.LayerNorm(256),
            nn.GELU(),
            nn.Dropout(0.3),
            nn.Linear(256, 64),
            nn.GELU(),
            nn.Dropout(0.15),
            nn.Linear(64, num_classes)
        )

        # 5. Temperature Scaler for Calibrated Probabilities
        self.scaler = TemperatureScaler()

    def forward(
        self,
        pixel_values: torch.Tensor,
        forensic_features: Optional[torch.Tensor] = None
    ) -> torch.Tensor:
        """
        Forward pass.
        Args:
            pixel_values: Normalized image tensor (B, 3, 224, 224)
            forensic_features: Optional pre-extracted forensic features (B, 128)
        Returns:
            logits: (B, 2)
        """
        # Stream 1: CLIP Visual Features (B, 512)
        vision_outputs = self.vision_encoder(pixel_values=pixel_values)
        visual_embeds = self.visual_norm(vision_outputs.image_embeds)

        # Stream 2: Forensic Features (B, 128)
        if forensic_features is None:
            forensic_features = self.forensic_extractor.extract_from_tensor_batch(pixel_values)
        else:
            forensic_features = forensic_features.to(device=pixel_values.device, dtype=torch.float32)
        forensic_embeds = self.forensic_proj(forensic_features)

        # Fusion: Concatenation (B, 640)
        fused = torch.cat([visual_embeds, forensic_embeds], dim=-1)

        # Classification Head (B, 2)
        logits = self.classifier_head(fused)
        return logits

    def predict_probabilities(
        self,
        pixel_values: torch.Tensor,
        forensic_features: Optional[torch.Tensor] = None,
        calibrate: bool = True
    ) -> torch.Tensor:
        """
        Returns calibrated probability distribution over classes [P(real), P(fake)].
        """
        logits = self.forward(pixel_values, forensic_features)
        if calibrate:
            logits = self.scaler(logits)
        return torch.softmax(logits, dim=-1)
