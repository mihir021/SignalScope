"""
SignalScope - Canonical Data Split Utility
============================================
Single source of truth for validation/test index generation.

Exists specifically to prevent the val/test leakage bug: model
checkpoint selection (validation) and final reported metrics (test)
must NEVER see the same images, or every "held-out" number in
evaluate.py is meaningless.

Usage:
    from model.splits import get_disjoint_val_test_indices

    val_idx, test_idx = get_disjoint_val_test_indices(
        total_size=len(raw_dataset["test"]),
        val_size=2000,
        test_size=2000,
        seed=42
    )
    # train.py uses val_idx to select the best checkpoint
    # evaluate.py uses test_idx to report final metrics
    # These two arrays are guaranteed to never overlap.
"""

import numpy as np
from typing import Tuple


def get_disjoint_val_test_indices(
    total_size: int,
    val_size: int,
    test_size: int,
    seed: int = 42
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Splits a pool of `total_size` items into disjoint val/test index arrays.

    Non-overlap is guaranteed by construction: a single shuffle of the
    full index range is sliced sequentially, so val and test can never
    draw the same index, regardless of val_size/test_size/seed values.

    Args:
        total_size: size of the pool to split (e.g. len of the HF 'test' split)
        val_size: number of indices to reserve for validation / checkpoint selection
        test_size: number of indices to reserve for final reported evaluation
        seed: fixed seed for reproducibility across train.py and evaluate.py

    Returns:
        (val_indices, test_indices) - two disjoint 1D numpy arrays
    """
    if val_size < 0 or test_size < 0:
        raise ValueError("val_size and test_size must be non-negative")
    if val_size + test_size > total_size:
        raise ValueError(
            f"val_size ({val_size}) + test_size ({test_size}) = "
            f"{val_size + test_size} exceeds total_size ({total_size}); "
            f"reduce subset sizes or use the full pool."
        )

    rng = np.random.RandomState(seed)
    shuffled = rng.permutation(total_size)

    val_indices = shuffled[:val_size]
    test_indices = shuffled[val_size:val_size + test_size]

    return val_indices, test_indices


def assert_disjoint(indices_a: np.ndarray, indices_b: np.ndarray, name_a: str = "a", name_b: str = "b") -> None:
    """
    Hard runtime guard. Call this at the top of evaluate.py and train.py
    right after generating splits, so a future refactor that reintroduces
    leakage fails loudly at run time instead of silently inflating metrics.
    """
    overlap = set(indices_a.tolist()) & set(indices_b.tolist())
    if overlap:
        raise RuntimeError(
            f"Data leakage detected: {len(overlap)} indices appear in both "
            f"'{name_a}' and '{name_b}' splits. Refusing to proceed - "
            f"any metric computed from this split is invalid."
        )


def get_generator_disjoint_splits(
    generator_labels: np.ndarray,
    unseen_generator_ids: list,
    val_ratio: float = 0.15,
    seed: int = 42
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Creates strictly generator-disjoint train/val and unseen test splits (SIH Tie-Breaker #1).

    Args:
        generator_labels: 1D array of generator IDs (0=Real, 1..K=Synthetic generators)
        unseen_generator_ids: List of generator IDs strictly reserved for unseen zero-shot evaluation
        val_ratio: Fraction of seen data to allocate to validation
        seed: Random seed for reproducibility

    Returns:
        (seen_train_indices, seen_val_indices, unseen_test_indices)
    """
    unseen_set = set(unseen_generator_ids)
    rng = np.random.RandomState(seed)

    unseen_test_mask = np.isin(generator_labels, list(unseen_set))
    unseen_test_indices = np.where(unseen_test_mask)[0]

    seen_indices = np.where(~unseen_test_mask)[0]
    shuffled_seen = rng.permutation(seen_indices)

    val_count = int(len(seen_indices) * val_ratio)
    seen_val_indices = shuffled_seen[:val_count]
    seen_train_indices = shuffled_seen[val_count:]

    return seen_train_indices, seen_val_indices, unseen_test_indices


def assert_generator_disjoint(
    seen_generators: list,
    unseen_generators: list
) -> None:
    """
    Hard runtime guard ensuring zero overlap between seen training generators
    and unseen evaluation generators.
    """
    overlap = set(seen_generators) & set(unseen_generators)
    if overlap:
        raise RuntimeError(
            f"Unseen Generator Leakage detected: Generators {overlap} are present in "
            f"both seen training and unseen evaluation sets. Violation of SIH §4.1."
        )

