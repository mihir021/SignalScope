"""
SignalScope - Official Core Model Inference Interface
======================================================
Implements the required predict interface from Section 4.1 & 7.1 of the SIH Problem Statement.
Loads the trained DualStreamClassifier (CLIP ViT-B/16 + Forensic Stream),
executes calibrated inference, and returns structured predictions.
"""

import os
import sys
# Ensure project root is in sys.path when script is executed directly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import logging
from typing import Dict, Any, Union
from PIL import Image, ImageOps
import torch

from model.classifier import DualStreamClassifier
from model.dataset import get_transforms
from model.forensic import ForensicExtractor

logger = logging.getLogger("signalscope-model")


class ImageClassifier:
    """
    Production-ready ImageClassifier handling weight loading,
    transforms, and dual-stream inference.
    """

    def __init__(self, model_path: str = "model/weights/best_classifier.pt"):
        self.model_path = model_path
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.transform = get_transforms(is_train=False)
        self.forensic_extractor = ForensicExtractor()
        self.model = None
        self.is_loaded = False
        self._load_model()

    def _load_model(self):
        """
        Loads the DualStreamClassifier and weights into memory.
        """
        try:
            logger.info(f"Initializing DualStreamClassifier on {self.device}...")
            self.model = DualStreamClassifier(freeze_backbone=True).to(self.device)

            if os.path.exists(self.model_path):
                checkpoint = torch.load(self.model_path, map_location=self.device, weights_only=False)
                state_dict = checkpoint.get("model_state_dict", checkpoint)
                missing, unexpected = self.model.load_state_dict(state_dict, strict=False)
                critical_missing = [k for k in missing if "vision_encoder" not in k]
                if critical_missing:
                    logger.warning(f"Warning: Non-backbone keys missing from checkpoint: {critical_missing}")
                logger.info(f"Loaded trained weights from: {self.model_path}")
            else:
                logger.info(f"No checkpoint found at '{self.model_path}'. Running with initialized weights.")

            self.model.eval()
            self.is_loaded = True
        except Exception as e:
            logger.error(f"Error loading model: {e}", exc_info=True)
            self.is_loaded = False

    def predict(self, image_input: Union[Image.Image, str]) -> Dict[str, Any]:
        """
        Run inference on an image (PIL Image object or file path).

        Args:
            image_input: PIL Image or string path to an image file.

        Returns:
            Dict[str, Any]:
                - 'label': 'real' or 'fake'
                - 'confidence': float between 0.0 and 1.0 (calibrated)
                - 'probabilities': {'real': float, 'fake': float}
        """
        if isinstance(image_input, str):
            with Image.open(image_input) as img:
                image = img.copy()
        elif isinstance(image_input, Image.Image):
            image = image_input
        else:
            raise ValueError(f"Unsupported image input type: {type(image_input)}")

        # Respect EXIF orientation tags from smartphone cameras
        image = ImageOps.exif_transpose(image).convert("RGB")

        # 1. Extract 128-d forensic features
        forensic_feats = self.forensic_extractor.extract_from_pil(image)
        forensic_tensor = torch.tensor(forensic_feats, dtype=torch.float32).unsqueeze(0).to(self.device)

        # 2. Pixel transforms for CLIP
        pixel_tensor = self.transform(image).unsqueeze(0).to(self.device)

        # 3. Model forward pass with temperature calibration
        with torch.no_grad():
            probs = self.model.predict_probabilities(pixel_tensor, forensic_tensor, calibrate=True)
            real_prob = float(probs[0, 0].item())
            fake_prob = float(probs[0, 1].item())

        predicted_label = "fake" if fake_prob >= 0.5 else "real"
        # SIH Rubric: Frame as responsible likelihood assessments ("likely AI-generated"), never accusations
        verdict = "likely AI-generated" if fake_prob >= 0.5 else "likely authentic / real"
        confidence = float(max(real_prob, fake_prob))

        return {
            "label": predicted_label,
            "verdict": verdict,
            "confidence": round(confidence, 4),
            "probabilities": {
                "real": round(real_prob, 4),
                "fake": round(fake_prob, 4)
            }
        }

    def predict_detailed(self, image_input: Union[Image.Image, str]) -> Dict[str, Any]:
        """
        Run inference with full explainability diagnostics (Bonus Track A):
        Returns:
            - Standard prediction (label, verdict, confidence, probabilities)
            - 2D-FFT magnitude spectrum map
            - 2D noise residual map
            - 1D radial azimuthal profile
            - Visual stream vs Forensic stream L2 norms
        """
        if isinstance(image_input, str):
            with Image.open(image_input) as img:
                image = img.copy()
        elif isinstance(image_input, Image.Image):
            image = image_input
        else:
            raise ValueError(f"Unsupported image input type: {type(image_input)}")

        image = ImageOps.exif_transpose(image).convert("RGB")

        diagnostics = self.forensic_extractor.extract_diagnostics(image)
        forensic_tensor = torch.tensor(diagnostics["forensic_vector"], dtype=torch.float32).unsqueeze(0).to(self.device)
        pixel_tensor = self.transform(image).unsqueeze(0).to(self.device)

        with torch.no_grad():
            vision_outputs = self.model.vision_encoder(pixel_values=pixel_tensor)
            visual_embeds = self.model.visual_norm(vision_outputs.image_embeds)
            forensic_embeds = self.model.forensic_proj(forensic_tensor)
            fused = torch.cat([visual_embeds, forensic_embeds], dim=-1)
            logits = self.model.classifier_head(fused)
            calibrated_logits = self.model.scaler(logits)
            probs = torch.softmax(calibrated_logits, dim=-1)

            real_prob = float(probs[0, 0].item())
            fake_prob = float(probs[0, 1].item())
            visual_norm = float(torch.norm(visual_embeds, p=2).item())
            forensic_norm = float(torch.norm(forensic_embeds, p=2).item())

        predicted_label = "fake" if fake_prob >= 0.5 else "real"
        verdict = "likely AI-generated" if fake_prob >= 0.5 else "likely authentic / real"
        confidence = float(max(real_prob, fake_prob))

        return {
            "label": predicted_label,
            "verdict": verdict,
            "confidence": round(confidence, 4),
            "probabilities": {
                "real": round(real_prob, 4),
                "fake": round(fake_prob, 4)
            },
            "diagnostics": {
                "visual_norm": round(visual_norm, 4),
                "forensic_norm": round(forensic_norm, 4),
                "temperature": round(float(self.model.scaler.temperature.item()), 4),
                "fft_spectrum_2d": diagnostics["fft_spectrum_2d"],
                "radial_profile": diagnostics["radial_profile"],
                "noise_residual_2d": diagnostics["noise_residual_2d"],
            }
        }


# Global singleton instance for model reuse across API requests
classifier = ImageClassifier()


def predict(image_input: Union[Image.Image, str]) -> Dict[str, Any]:
    """
    Standard top-level predict function adhering to the SIH Problem Statement contract.
    """
    return classifier.predict(image_input)


def predict_detailed(image_input: Union[Image.Image, str]) -> Dict[str, Any]:
    """
    Detailed inference with visual explainability maps (Bonus Track A).
    """
    return classifier.predict_detailed(image_input)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        img_path = sys.argv[1]
        print(f"Running prediction on: {img_path}")
        result = predict(img_path)
        print(f"Result: {result}")
    else:
        # Self-test on synthetic sample
        test_img = Image.new("RGB", (224, 224), (200, 100, 50))
        print("Self-test inference on synthetic sample:")
        print(predict(test_img))
