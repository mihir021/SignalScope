"""
SignalScope - Dataset Pipeline & Robust Augmentation
=====================================================
Handles:
1. Defactify Dataset Loading: Real (MS COCO natural photography) vs Fake (SD 2.1, SDXL, SD 3, DALL-E 3, Midjourney v6)
2. Compression & Real-World Augmentations (JPEG degradation quality 40-90, flips)
3. Standard CLIP Preprocessing & Forensic Feature Preparation
4. Generic LocalFolderDataset support for Synthbuster / challenge dataset evaluation
"""

import io
import random
import numpy as np
from PIL import Image
import torch
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from typing import Optional, Callable, Dict, Any, List
import os

from model.forensic import ForensicExtractor


class RandomJPEGCompression:
    """
    Simulates real-world social media compression by encoding image to JPEG
    with a random quality factor between min_quality and max_quality.
    """

    def __init__(self, p: float = 0.5, min_quality: int = 40, max_quality: int = 90):
        self.p = p
        self.min_quality = min_quality
        self.max_quality = max_quality

    def __call__(self, img: Image.Image) -> Image.Image:
        if random.random() > self.p:
            return img

        quality = random.randint(self.min_quality, self.max_quality)
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=quality)
        buffer.seek(0)
        return Image.open(buffer).copy()


def get_transforms(is_train: bool = True) -> transforms.Compose:
    """
    Returns image transformation pipeline for CLIP ViT-B/16.
    CLIP standard: 224x224, mean=[0.48145466, 0.4578275, 0.40821073], std=[0.26862954, 0.26130258, 0.27577711]
    Note: Geometric & degradation augmentations (JPEG, flip) are handled at the PIL level
    in Dataset classes so both visual and forensic streams receive the exact same augmented image.
    """
    clip_mean = [0.48145466, 0.4578275, 0.40821073]
    clip_std = [0.26862954, 0.26130258, 0.27577711]

    return transforms.Compose([
        transforms.Resize((224, 224), interpolation=transforms.InterpolationMode.BICUBIC),
        transforms.ToTensor(),
        transforms.Normalize(mean=clip_mean, std=clip_std)
    ])


class LocalFolderDataset(Dataset):
    """
    Dataset loader for local folders:
    root/
      real/
      fake/
    Used for GenImage subsets or official challenge evaluation images.
    """

    def __init__(
        self,
        root_dir: str,
        transform: Optional[Callable] = None,
        extract_forensic: bool = True,
        is_train: bool = False
    ):
        self.root_dir = root_dir
        self.is_train = is_train
        self.transform = transform or get_transforms(is_train=is_train)
        self.extract_forensic = extract_forensic
        self.forensic_extractor = ForensicExtractor() if extract_forensic else None
        self.jpeg_aug = RandomJPEGCompression(p=0.4, min_quality=40, max_quality=90) if is_train else None
        self.flip_aug = transforms.RandomHorizontalFlip(p=0.5) if is_train else None
        self.samples = []

        # Supported aliases for real and synthetic directory structures
        folder_aliases = {
            0: ["real", "0_real", "authentic", "nature", "pristine", "0"],
            1: ["fake", "1_fake", "synthetic", "ai", "generated", "1", "manipulated"]
        }

        # Check existing directories matching known aliases
        for label_idx, aliases in folder_aliases.items():
            matched_dirs = [
                os.path.join(root_dir, d) for d in os.listdir(root_dir)
                if os.path.isdir(os.path.join(root_dir, d)) and d.lower() in aliases
            ] if os.path.isdir(root_dir) else []

            for class_dir in matched_dirs:
                for root, _, files in os.walk(class_dir):
                    for fname in sorted(files):
                        if fname.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                            self.samples.append((os.path.join(root, fname), label_idx))

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> Dict[str, Any]:
        path, label = self.samples[idx]
        image = Image.open(path).convert("RGB")

        if self.is_train:
            if self.jpeg_aug is not None:
                image = self.jpeg_aug(image)
            if self.flip_aug is not None:
                image = self.flip_aug(image)

        forensic_feats = (
            self.forensic_extractor.extract_from_pil(image)
            if self.extract_forensic
            else np.zeros(128, dtype=np.float32)
        )
        pixel_tensor = self.transform(image)

        return {
            "pixel_values": pixel_tensor,
            "forensic_features": torch.tensor(forensic_feats, dtype=torch.float32),
            "label": torch.tensor(label, dtype=torch.long),
            "path": path
        }


class DefactifyDataset(Dataset):
    """
    PyTorch Dataset wrapping Rajarshi-Roy-research/Defactify_Image_Dataset.

    Confirmed Ground-Truth Labels:
      - Label_A: 0 = REAL (MS COCO natural photography)
                 1 = FAKE (SD 2.1, SDXL, SD 3, DALL-E 3, Midjourney v6)
      - Label_B: Generator ID:
                 0 = Real
                 1..5 = Synthetic generator families (preserved for Bonus B attribution)

    Yields a dictionary adhering to SignalScope's standard contract:
      - pixel_values: Normalized CLIP tensor of shape (3, 224, 224)
      - forensic_features: 128-d tensor (64 FFT azimuthal + 64 noise residual moments)
      - label: 0 (real) or 1 (fake)
      - generator_label: 0 to 5
    """

    def __init__(
        self,
        hf_dataset_split,
        transform: Optional[Callable] = None,
        extract_forensic: bool = True,
        is_train: bool = False
    ):
        self.data = hf_dataset_split
        self.is_train = is_train
        self.transform = transform or get_transforms(is_train=is_train)
        self.extract_forensic = extract_forensic
        self.forensic_extractor = ForensicExtractor() if extract_forensic else None
        self.jpeg_aug = RandomJPEGCompression(p=0.4, min_quality=40, max_quality=90) if is_train else None
        self.flip_aug = transforms.RandomHorizontalFlip(p=0.5) if is_train else None

    def __len__(self) -> int:
        return len(self.data)

    def __getitem__(self, idx: int) -> Dict[str, Any]:
        item = self.data[idx]
        image = item.get("Image", item.get("image"))
        if image is None:
            raise ValueError(f"No image key found in Defactify item: available keys = {list(item.keys())}")
        label = int(item.get("Label_A", item.get("label", 0)))  # 0 = REAL, 1 = FAKE
        generator_label = int(item.get("Label_B", item.get("generator_label", 0)))

        if not isinstance(image, Image.Image):
            image = Image.fromarray(image)
        image = image.convert("RGB")

        # Synchronized training augmentations across both streams
        if self.is_train:
            if self.jpeg_aug is not None:
                image = self.jpeg_aug(image)
            if self.flip_aug is not None:
                image = self.flip_aug(image)

        # 1. 128-d forensic features
        forensic_feats = (
            self.forensic_extractor.extract_from_pil(image)
            if self.extract_forensic
            else np.zeros(128, dtype=np.float32)
        )

        # 2. Pixel transforms for CLIP
        pixel_tensor = self.transform(image)

        return {
            "pixel_values": pixel_tensor,
            "forensic_features": torch.tensor(forensic_feats, dtype=torch.float32),
            "label": torch.tensor(label, dtype=torch.long),
            "generator_label": torch.tensor(generator_label, dtype=torch.long)
        }


def create_balanced_defactify_indices(
    hf_dataset_split,
    samples_per_generator: int = 2000,
    seed: int = 42
) -> np.ndarray:
    """
    Creates a balanced 50/50 index subset from a Defactify split.
    Guarantees equal class priors:
      - Real samples (Label_A == 0, Label_B == 0): matching synthetic total
      - Synthetic samples: samples_per_generator per each generator ID (1..5)
    Total samples = samples_per_generator * 10 (e.g. 2,000 * 10 = 20,000).
    """
    rng = np.random.RandomState(seed)

    # Group indices by Label_B (0 = Real, 1..5 = Synthetic generators)
    indices_by_gen: Dict[int, List[int]] = {g: [] for g in range(6)}

    labels_b = hf_dataset_split["Label_B"]
    for idx, gen_id in enumerate(labels_b):
        gen_id_int = int(gen_id)
        if gen_id_int in indices_by_gen:
            indices_by_gen[gen_id_int].append(idx)

    selected_indices = []

    # 1. Select synthetic generators (dynamically detected from present non-zero classes)
    synthetic_gens = sorted([g for g in indices_by_gen.keys() if g != 0 and len(indices_by_gen[g]) > 0])
    for gen_id in synthetic_gens:
        pool = indices_by_gen[gen_id]
        quota = min(len(pool), samples_per_generator)
        chosen = rng.choice(pool, quota, replace=False)
        selected_indices.extend(chosen)

    num_synthetic = len(selected_indices)

    # 2. Select matching number of real samples to achieve exact 50/50 balance
    real_pool = indices_by_gen[0]
    real_quota = min(len(real_pool), num_synthetic)
    chosen_real = rng.choice(real_pool, real_quota, replace=False)
    selected_indices.extend(chosen_real)

    # Shuffle combined indices
    rng.shuffle(selected_indices)
    return np.array(selected_indices, dtype=np.int64)
