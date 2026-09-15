"""
SignalScope - Object-Aware Region Captioner
===========================================
Provides two classes consumed by model/explain.py:

  HotspotExtractor
    Computes the bounding box of the highest-saliency region from a heatmap
    and returns a cropped PIL image of that region.

  CLIPRegionCaptioner
    Uses the frozen CLIP ViT-B/16 already loaded in the SignalScope classifier
    to embed the crop, ranks it against a broad object-label vocabulary via
    cosine similarity, and returns the best-matching human-readable label.

No additional model downloads are required — the same
openai/clip-vit-base-patch16 checkpoint already used by the classifier is
reused for both vision and (lazily-loaded) text encoding.

Design principles
-----------------
* Pure fallback on every exception — never crashes prediction.
* Text embeddings are computed once and cached per CLIPRegionCaptioner
  instance (the instance is stored on ImageClassifier so it lives as long as
  the API process).
* HotspotExtractor works in pure NumPy / PIL with no model calls.
"""

import logging
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from PIL import Image
import torch

logger = logging.getLogger("signalscope-region-captioner")


# ---------------------------------------------------------------------------
# Object Vocabulary for CLIP Zero-Shot Classification
# ---------------------------------------------------------------------------
# Covers a wide range of photographic subjects:
#   human faces / body parts · animals · vehicles · architecture ·
#   nature / outdoor scenes · interior objects · generic patterns
#
# Labels are written as noun-phrases that complete the prompt
#   "a photo showing {label}"
# so they are in CLIP's natural language distribution.

CLIP_OBJECT_LABELS: List[str] = [
    # ── Human face & features ──────────────────────────────────────────────
    "a human face",
    "a person's eyes and eyebrows",
    "a person's hair",
    "a person's mouth and teeth",
    "a person's nose",
    "a person's ear",
    "human skin texture",
    "a person's hand or fingers",
    "a person's neck and shoulders",
    "human clothing or fabric",
    # ── Animals ────────────────────────────────────────────────────────────
    "a lion's face and mane",
    "a tiger's face and stripes",
    "a cat",
    "a dog",
    "a bird",
    "a horse",
    "an elephant",
    "a bear",
    "a wolf or fox",
    "an animal's face",
    "an animal's fur or coat",
    # ── Vehicles & urban ───────────────────────────────────────────────────
    "a car or automobile",
    "a truck or large vehicle",
    "a bicycle or motorcycle",
    "a building facade or architecture",
    "a road or pavement",
    "a window or door",
    "a signboard or display",
    # ── Nature & outdoors ──────────────────────────────────────────────────
    "trees and foliage",
    "the sky and clouds",
    "grass or ground",
    "water or ocean",
    "a mountain or rocky terrain",
    "a flower or plant",
    # ── Interior & everyday objects ────────────────────────────────────────
    "furniture or indoor decor",
    "food or drink",
    "a hand holding an object",
    # ── Generic patterns / backgrounds ─────────────────────────────────────
    "background scenery",
    "a blurred background",
    "a textured or patterned surface",
]

CLIP_SCENE_LABELS: List[str] = [
    "an outdoor nature or wilderness landscape",
    "an urban city street with architecture",
    "an indoor domestic room or interior",
    "a studio portrait setting with neutral background",
    "a park or garden with trees and greenery",
    "a coastal, ocean, or water environment",
    "a road, highway, or vehicle travel scene",
    "an office, commercial, or public interior",
    "an open sky or scenic outdoor atmosphere",
]

CLIP_STYLE_LABELS: List[str] = [
    "a realistic photographic capture",
    "a portrait photograph",
    "a wide-angle landscape photograph",
    "a macro close-up photograph",
    "a digital art illustration",
    "a 3D computer-generated graphic",
    "a stylized painting or artwork",
]


# ---------------------------------------------------------------------------
# HotspotExtractor
# ---------------------------------------------------------------------------

class HotspotExtractor:
    """
    Selects the bounding box of the highest-saliency region from a normalised
    [0, 1] heatmap and returns both the bbox coordinates and a PIL crop of
    that region from the original image.

    Selection strategy (in priority order)
    ----------------------------------------
    1. Pixels with saliency >= ``threshold`` (default 0.75):
       use their tight bounding box.
    2. If the bbox covers > 60 % of the image (widespread heatmap):
       shrink to a ±20 % centroid crop around the mean hotspot position.
    3. If no pixels exceed ``threshold``, retry at 0.50.
    4. If still empty: return the central 50 % crop (safe fallback).
    """

    def extract_bbox(
        self,
        heatmap: np.ndarray,
        threshold: float = 0.75,
    ) -> Dict[str, Any]:
        """
        Returns a dict with keys:
          y1, x1, y2, x2          — heatmap-space pixel coordinates
          area_fraction            — fraction of heatmap covered by bbox
          is_widespread            — True when bbox > 60 % of image area
          crop_strategy            — one of "threshold_bbox", "centroid_40pct",
                                     "fallback_50", "central_fallback"
        """
        h, w = heatmap.shape
        total = h * w

        # Try each threshold in descending order
        mask = None
        used_threshold = threshold
        for thr in (threshold, 0.50):
            m = heatmap >= thr
            if m.any():
                mask = m
                used_threshold = thr
                break

        # Ultimate fallback: centre-quarter
        if mask is None or not mask.any():
            cy, cx = h // 2, w // 2
            ph, pw = max(h // 4, 1), max(w // 4, 1)
            return {
                "y1": max(0, cy - ph), "x1": max(0, cx - pw),
                "y2": min(h, cy + ph), "x2": min(w, cx + pw),
                "area_fraction": 0.25,
                "is_widespread": True,
                "crop_strategy": "central_fallback",
                "used_threshold": used_threshold,
            }

        ys, xs = np.where(mask)
        y1r, x1r = int(ys.min()), int(xs.min())
        y2r, x2r = int(ys.max()) + 1, int(xs.max()) + 1
        area_frac = ((y2r - y1r) * (x2r - x1r)) / total
        is_widespread = area_frac > 0.60

        if is_widespread:
            # Narrow to ±20 % of image dimensions around saliency centroid
            cy_f = float(ys.mean())
            cx_f = float(xs.mean())
            # Weight centroid by saliency value for sharper localisation
            saliency_vals = heatmap[ys, xs]
            if saliency_vals.sum() > 0:
                cy_f = float(np.average(ys, weights=saliency_vals))
                cx_f = float(np.average(xs, weights=saliency_vals))
            cy_i, cx_i = int(cy_f), int(cx_f)
            pad_h = max(int(h * 0.20), 1)
            pad_w = max(int(w * 0.20), 1)
            return {
                "y1": max(0, cy_i - pad_h), "x1": max(0, cx_i - pad_w),
                "y2": min(h, cy_i + pad_h), "x2": min(w, cx_i + pad_w),
                "area_fraction": round(area_frac, 4),
                "is_widespread": True,
                "crop_strategy": "centroid_40pct",
                "used_threshold": used_threshold,
            }

        return {
            "y1": y1r, "x1": x1r,
            "y2": y2r, "x2": x2r,
            "area_fraction": round(area_frac, 4),
            "is_widespread": False,
            "crop_strategy": "threshold_bbox",
            "used_threshold": used_threshold,
        }

    def crop_region(
        self,
        image: Image.Image,
        heatmap: np.ndarray,
        threshold: float = 0.75,
    ) -> Tuple[Image.Image, Dict[str, Any]]:
        """
        Returns ``(crop_pil, bbox_info)`` where bbox_info contains heatmap-space
        coordinates AND pixel-space coordinates (px_x1 … px_y2) in the
        original image resolution.

        The crop is guaranteed to be at least 32×32 pixels.
        """
        orig_w, orig_h = image.size
        hmap_h, hmap_w = heatmap.shape

        bbox = self.extract_bbox(heatmap, threshold)

        # Scale heatmap-space bbox → original image pixel-space
        scale_y = orig_h / hmap_h
        scale_x = orig_w / hmap_w
        px_y1 = int(bbox["y1"] * scale_y)
        px_x1 = int(bbox["x1"] * scale_x)
        px_y2 = max(int(bbox["y2"] * scale_y), px_y1 + 1)
        px_x2 = max(int(bbox["x2"] * scale_x), px_x1 + 1)

        # Guarantee minimum 32×32 crop
        if px_y2 - px_y1 < 32:
            pad = (32 - (px_y2 - px_y1)) // 2 + 1
            px_y1 = max(0, px_y1 - pad)
            px_y2 = min(orig_h, px_y2 + pad)
        if px_x2 - px_x1 < 32:
            pad = (32 - (px_x2 - px_x1)) // 2 + 1
            px_x1 = max(0, px_x1 - pad)
            px_x2 = min(orig_w, px_x2 + pad)

        crop = image.crop((px_x1, px_y1, px_x2, px_y2))

        return crop, {
            **bbox,
            "px_x1": px_x1, "px_y1": px_y1,
            "px_x2": px_x2, "px_y2": px_y2,
        }


# ---------------------------------------------------------------------------
# CLIPRegionCaptioner
# ---------------------------------------------------------------------------

class CLIPRegionCaptioner:
    """
    CLIP zero-shot region classifier.

    Given a cropped PIL image, embeds it with the frozen CLIP ViT-B/16 vision
    encoder (already loaded in ``SignalScopeClassifier``) and ranks all labels
    in ``CLIP_OBJECT_LABELS`` by cosine similarity to the crop embedding.
    Returns the top-1 label as human-readable ``content``.

    Text embeddings for the full label vocabulary are computed once and cached
    on the first call.

    Parameters
    ----------
    classifier_instance : ImageClassifier | None
        Must expose ``.model.vision_encoder``, ``.transform``, and ``.device``.
        When None, all calls fall back to "the image region".
    """

    _PROMPT_TEMPLATE = "a photo showing {label}"

    def __init__(self, classifier_instance=None) -> None:
        self._clf = classifier_instance
        self._tokenizer = None
        self._text_model = None
        self._text_embeds_cache: Optional["torch.Tensor"] = None  # (N_labels, 512)
        self._scene_embeds_cache: Optional["torch.Tensor"] = None
        self._style_embeds_cache: Optional["torch.Tensor"] = None

    # ------------------------------------------------------------------ #
    # Private helpers                                                      #
    # ------------------------------------------------------------------ #

    def _ensure_text_model(self) -> bool:
        """
        Lazily loads CLIPTokenizer + CLIPTextModelWithProjection.
        Reuses the cached copy from the classifier when already loaded.
        Returns True on success, False on any error.
        """
        if self._tokenizer is not None and self._text_model is not None:
            return True
        try:
            # Reuse already-loaded instances from classifier (avoids double load)
            if (
                self._clf is not None
                and hasattr(self._clf, "_tokenizer")
                and self._clf._tokenizer is not None
                and hasattr(self._clf, "_text_model")
                and self._clf._text_model is not None
            ):
                self._tokenizer = self._clf._tokenizer
                self._text_model = self._clf._text_model
                logger.debug("Reusing classifier's CLIPTextModel for region captioner.")
                return True

            from transformers import CLIPTokenizer, CLIPTextModelWithProjection
            import torch
            device = getattr(self._clf, "device", torch.device("cpu"))
            self._tokenizer = CLIPTokenizer.from_pretrained("openai/clip-vit-base-patch16")
            self._text_model = (
                CLIPTextModelWithProjection.from_pretrained("openai/clip-vit-base-patch16")
                .to(device)
                .eval()
            )
            logger.info("Loaded CLIP text model for region captioner.")
            return True
        except Exception as exc:
            logger.warning("Cannot load CLIP text model for region captioning: %s", exc)
            return False

    def _get_text_embeddings(self):
        """
        Pre-computes and caches normalised text embeddings for the entire
        CLIP_OBJECT_LABELS vocabulary.  Returns a (N, 512) torch.Tensor or None.
        """
        if self._text_embeds_cache is not None:
            return self._text_embeds_cache
        if not self._ensure_text_model():
            return None
        try:
            import torch
            device = next(self._text_model.parameters()).device
            prompts = [
                self._PROMPT_TEMPLATE.format(label=lbl)
                for lbl in CLIP_OBJECT_LABELS
            ]
            inputs = self._tokenizer(
                prompts,
                padding=True,
                truncation=True,
                max_length=77,
                return_tensors="pt",
            ).to(device)
            with torch.no_grad():
                out = self._text_model(**inputs)
                embeds = out.text_embeds          # (N, 512)
                embeds = embeds / embeds.norm(dim=-1, keepdim=True)
            self._text_embeds_cache = embeds
            logger.info(
                "Cached CLIP text embeddings for %d region labels.", len(CLIP_OBJECT_LABELS)
            )
            return embeds
        except Exception as exc:
            logger.warning("Failed to build region-label text embeddings: %s", exc)
            return None

    # ------------------------------------------------------------------ #
    # Public API                                                           #
    # ------------------------------------------------------------------ #

    def caption_region(
        self,
        crop: Image.Image,
        top_k: int = 3,
    ) -> Dict[str, Any]:
        """
        Identifies the content of a cropped image region via CLIP zero-shot.

        Parameters
        ----------
        crop   : PIL.Image.Image — the hotspot region crop (any size ≥ 1×1).
        top_k  : int             — how many top labels to include in the response.

        Returns
        -------
        dict with keys:
          content    — human-readable top-1 label string
          confidence — cosine-similarity score of the top-1 match (float)
          top_labels — list of (label_str, score) tuples, length = top_k
          method     — "clip_zero_shot" on success, "fallback" on error
        """
        _fallback = {
            "content": "the image region",
            "confidence": 0.0,
            "top_labels": [],
            "method": "fallback",
        }

        if self._clf is None:
            return _fallback

        try:
            import torch
            text_embeds = self._get_text_embeddings()
            if text_embeds is None:
                return _fallback

            device = self._clf.device
            crop_rgb = crop.convert("RGB")
            pixel_tensor = self._clf.transform(crop_rgb).unsqueeze(0).to(device)

            with torch.no_grad():
                img_out = self._clf.model.vision_encoder(pixel_values=pixel_tensor)
                img_embed = img_out.image_embeds           # (1, 512)
                img_embed = img_embed / img_embed.norm(dim=-1, keepdim=True)

            # Cosine similarities against all labels
            sims = (img_embed @ text_embeds.t()).squeeze(0).cpu().numpy()   # (N,)
            top_indices = np.argsort(sims)[::-1][:top_k]
            top_labels = [
                (CLIP_OBJECT_LABELS[i], round(float(sims[i]), 4))
                for i in top_indices
            ]
            best_label = CLIP_OBJECT_LABELS[top_indices[0]]
            best_score = float(sims[top_indices[0]])

            return {
                "content": best_label,
                "confidence": round(best_score, 4),
                "top_labels": top_labels,
                "method": "clip_zero_shot",
            }

        except Exception as exc:
            logger.warning("Region captioning failed, using fallback: %s", exc)
            return _fallback

    def _compute_text_embeddings_for_list(self, labels: List[str]):
        """Helper to compute normalized CLIP text embeddings for any label list."""
        if not self._ensure_text_model():
            return None
        try:
            import torch
            device = next(self._text_model.parameters()).device
            prompts = [self._PROMPT_TEMPLATE.format(label=lbl) for lbl in labels]
            inputs = self._tokenizer(
                prompts,
                padding=True,
                truncation=True,
                max_length=77,
                return_tensors="pt",
            ).to(device)
            with torch.no_grad():
                out = self._text_model(**inputs)
                embeds = out.text_embeds
                embeds = embeds / embeds.norm(dim=-1, keepdim=True)
            return embeds
        except Exception as exc:
            logger.warning("Failed to build text embeddings: %s", exc)
            return None

    def describe_image(
        self,
        image: Image.Image,
        top_k: int = 5,
    ) -> Dict[str, Any]:
        """
        Synthesizes a whole-image semantic summary and context description.
        Overcomes limitations of tiny local heatmap crops on AI-generated images
        by evaluating the complete visual scene across objects, environment, and style.
        """
        _fallback = {
            "summary": "This image depicts visual content in a photographic or digital composition.",
            "primary_subject": "visual content",
            "subject_confidence": 0.5,
            "scene_type": "general scene",
            "detected_style": "photograph or digital artwork",
            "top_detected_concepts": [],
            "method": "fallback",
        }

        if self._clf is None:
            return _fallback

        try:
            import torch
            obj_embeds = self._get_text_embeddings()
            if obj_embeds is None:
                return _fallback

            if self._scene_embeds_cache is None:
                self._scene_embeds_cache = self._compute_text_embeddings_for_list(CLIP_SCENE_LABELS)
            if self._style_embeds_cache is None:
                self._style_embeds_cache = self._compute_text_embeddings_for_list(CLIP_STYLE_LABELS)

            device = self._clf.device
            img_rgb = image.convert("RGB")
            pixel_tensor = self._clf.transform(img_rgb).unsqueeze(0).to(device)

            with torch.no_grad():
                img_out = self._clf.model.vision_encoder(pixel_values=pixel_tensor)
                img_embed = img_out.image_embeds
                img_embed = img_embed / img_embed.norm(dim=-1, keepdim=True)

            # 1. Objects / Concepts
            obj_sims = (img_embed @ obj_embeds.t()).squeeze(0).cpu().numpy()
            top_obj_idx = np.argsort(obj_sims)[::-1][:top_k]
            top_concepts = [
                {"concept": CLIP_OBJECT_LABELS[i], "confidence": round(float(obj_sims[i]), 4)}
                for i in top_obj_idx
            ]
            primary_subject = top_concepts[0]["concept"] if top_concepts else "visual subject"
            primary_conf = top_concepts[0]["confidence"] if top_concepts else 0.5

            # 2. Scene Environment
            scene_type = "general scene"
            if self._scene_embeds_cache is not None:
                scene_sims = (img_embed @ self._scene_embeds_cache.t()).squeeze(0).cpu().numpy()
                best_scene_idx = int(np.argmax(scene_sims))
                scene_type = CLIP_SCENE_LABELS[best_scene_idx]

            # 3. Visual Style / Medium
            detected_style = "photograph"
            if self._style_embeds_cache is not None:
                style_sims = (img_embed @ self._style_embeds_cache.t()).squeeze(0).cpu().numpy()
                best_style_idx = int(np.argmax(style_sims))
                detected_style = CLIP_STYLE_LABELS[best_style_idx]

            # 4. Generate Natural-Language Narrative Summary
            secondary_cues = [c["concept"] for c in top_concepts[1:3] if c["concept"] != primary_subject]
            sec_text = f" with elements of {', '.join(secondary_cues)}" if secondary_cues else ""

            summary = (
                f"This image appears to be {detected_style} primarily featuring {primary_subject}{sec_text}, "
                f"situated in {scene_type}."
            )

            return {
                "summary": summary,
                "primary_subject": primary_subject,
                "subject_confidence": primary_conf,
                "scene_type": scene_type,
                "detected_style": detected_style,
                "top_detected_concepts": top_concepts,
                "method": "clip_zero_shot",
            }

        except Exception as exc:
            logger.warning("Whole-image description failed, using fallback: %s", exc)
            return _fallback


_global_captioner: Optional[CLIPRegionCaptioner] = None

def get_captioner(classifier_instance=None) -> CLIPRegionCaptioner:
    """Singleton getter for the shared CLIPRegionCaptioner instance."""
    global _global_captioner
    if _global_captioner is None:
        from model.predict import classifier as default_clf
        clf = classifier_instance if classifier_instance is not None else default_clf
        _global_captioner = CLIPRegionCaptioner(clf)
    return _global_captioner

