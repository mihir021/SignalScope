"""
SignalScope - Forensic Feature Extractor
=========================================
Extracts orthogonal frequency and sensor-noise domain features from input images:
1. 2D-FFT Azimuthal Power Spectrum Profile (64 dims):
   Detects grid-like artifacts and unnatural frequency falloff from generative upsamplers.
2. Noise Residual Statistical Moments (64 dims):
   Captures the absence of physical camera sensor PRNU noise and diffusion residual statistics.

Total Forensic Feature Dimension: 128
"""

import numpy as np
import scipy.ndimage
from scipy.stats import skew, kurtosis
from PIL import Image
import torch
import torch.nn as nn
from typing import Union


def rgb_to_gray(img_arr: np.ndarray) -> np.ndarray:
    """Convert RGB float array [0, 1] to grayscale float array [0, 1]."""
    if img_arr.ndim == 2:
        return img_arr
    return 0.2989 * img_arr[:, :, 0] + 0.5870 * img_arr[:, :, 1] + 0.1140 * img_arr[:, :, 2]


def compute_azimuthal_average(magnitude_spectrum: np.ndarray, num_bins: int = 64) -> np.ndarray:
    """
    Computes the 1D radial (azimuthal) profile of a centered 2D power spectrum.
    Measures the average energy at increasing radial distances from the DC center.
    """
    h, w = magnitude_spectrum.shape
    cy, cx = h // 2, w // 2

    # Coordinate grids centered at DC
    y, x = np.ogrid[:h, :w]
    r = np.sqrt((x - cx) ** 2 + (y - cy) ** 2)

    max_radius = min(cx, cy)
    if max_radius == 0:
        return np.zeros(num_bins, dtype=np.float32)

    # Bin indices
    bin_width = max_radius / num_bins
    r_bins = (r / bin_width).astype(int)

    # Accumulate sums and counts per radial bin
    radial_profile = np.zeros(num_bins, dtype=np.float32)
    for b in range(num_bins):
        mask = (r_bins == b)
        if np.any(mask):
            radial_profile[b] = magnitude_spectrum[mask].mean()

    # Normalize radial profile (zero mean, unit variance)
    std = radial_profile.std()
    if std > 1e-6:
        radial_profile = (radial_profile - radial_profile.mean()) / std
    else:
        radial_profile = radial_profile - radial_profile.mean()

    return radial_profile.astype(np.float32)


def extract_fft_features(img_arr: np.ndarray, num_bins: int = 64) -> np.ndarray:
    """
    Extracts the 64-dimensional FFT azimuthal energy spectrum profile.
    """
    gray = rgb_to_gray(img_arr)
    
    # 2D Fast Fourier Transform
    fft = np.fft.fft2(gray)
    fft_shifted = np.fft.fftshift(fft)
    
    # Log magnitude spectrum to compress dynamic range
    magnitude = np.log1p(np.abs(fft_shifted))
    
    # Extract radial energy distribution
    radial_profile = compute_azimuthal_average(magnitude, num_bins=num_bins)
    return radial_profile


def extract_noise_features(img_arr: np.ndarray, target_dim: int = 64) -> np.ndarray:
    """
    Extracts 64 statistical moments and correlation indicators from the high-frequency
    noise residual: R = I - denoise(I).
    """
    if img_arr.ndim == 2:
        img_arr = np.stack([img_arr] * 3, axis=-1)

    features = []
    residuals = []

    # Fast 3x3 median filter per channel to extract noise residual
    for c in range(3):
        channel = img_arr[:, :, c]
        denoised = scipy.ndimage.median_filter(channel, size=3)
        residual = channel - denoised
        residuals.append(residual)

        # Statistical moments of the noise
        mean_val = float(np.mean(residual))
        var_val = float(np.var(residual))
        skew_val = float(skew(residual.ravel())) if var_val > 1e-7 else 0.0
        kurt_val = float(kurtosis(residual.ravel())) if var_val > 1e-7 else 0.0

        # Percentiles (quantiles of the noise distribution)
        q25, q50, q75 = np.percentile(residual, [25, 50, 75])
        iqr = q75 - q25

        # High-frequency energy ratio
        hf_energy = float(np.mean(residual ** 2))

        features.extend([mean_val, var_val, skew_val, kurt_val, q25, q50, q75, iqr, hf_energy])

    def safe_corr(a: np.ndarray, b: np.ndarray) -> float:
        std_a, std_b = np.std(a), np.std(b)
        if std_a < 1e-6 or std_b < 1e-6:
            return 0.0
        cov = np.mean((a - np.mean(a)) * (b - np.mean(b)))
        return float(cov / (std_a * std_b + 1e-8))

    # Inter-channel correlation of residuals (real sensor noise is correlated across channels)
    r_res, g_res, b_res = residuals[0].ravel(), residuals[1].ravel(), residuals[2].ravel()
    features.extend([safe_corr(r_res, g_res), safe_corr(r_res, b_res), safe_corr(g_res, b_res)])

    # Spatial autocorrelation of the residual at lags (1,0), (0,1), (1,1)
    gray_res = rgb_to_gray(np.stack(residuals, axis=-1))
    h, w = gray_res.shape
    if h > 2 and w > 2:
        ac_h = safe_corr(gray_res[:-1, :].ravel(), gray_res[1:, :].ravel())
        ac_w = safe_corr(gray_res[:, :-1].ravel(), gray_res[:, 1:].ravel())
        ac_diag = safe_corr(gray_res[:-1, :-1].ravel(), gray_res[1:, 1:].ravel())
    else:
        ac_h, ac_w, ac_diag = 0.0, 0.0, 0.0
    features.extend([ac_h, ac_w, ac_diag])

    # Zero-pad or project to target_dim (64)
    feat_arr = np.nan_to_num(np.array(features, dtype=np.float32), nan=0.0, posinf=0.0, neginf=0.0)
    if len(feat_arr) < target_dim:
        padded = np.zeros(target_dim, dtype=np.float32)
        padded[:len(feat_arr)] = feat_arr
        return padded
    return feat_arr[:target_dim]


class ForensicExtractor(nn.Module):
    """
    Forensic feature extraction module combining 2D-FFT azimuthal profile
    and noise residual statistics into a unified 128-dimensional representation.
    """

    def __init__(self, fft_bins: int = 64, noise_dims: int = 64):
        super().__init__()
        self.fft_bins = fft_bins
        self.noise_dims = noise_dims
        self.total_dim = fft_bins + noise_dims

    def extract_from_pil(self, image: Image.Image) -> np.ndarray:
        """
        Extracts 128-d forensic vector from a single PIL image.
        """
        # Ensure RGB and standard size for feature consistency
        image_rgb = image.convert("RGB").resize((224, 224), Image.Resampling.BILINEAR)
        img_arr = np.asarray(image_rgb, dtype=np.float32) / 255.0

        fft_feats = extract_fft_features(img_arr, num_bins=self.fft_bins)
        noise_feats = extract_noise_features(img_arr, target_dim=self.noise_dims)

        forensic_vector = np.concatenate([fft_feats, noise_feats]).astype(np.float32)
        return forensic_vector

    def compute_native_sensor_autocorrelation(self, image: Image.Image) -> float:
        """
        Computes native spatial autocorrelation of the high-pass noise residual.
        Real CMOS camera sensor noise is spatially uncorrelated (Poisson/Gaussian i.i.d., AC in [-0.08, 0.08]).
        AI diffusion & GAN models leave spatial deconvolution correlation artifacts (AC > 0.15).
        """
        img_arr = np.asarray(image.convert("RGB"), dtype=np.float32) / 255.0
        gray = rgb_to_gray(img_arr)
        denoised = scipy.ndimage.median_filter(gray, size=3)
        res = gray - denoised
        h, w = res.shape
        if h > 2 and w > 2:
            r1 = res[:-1, :].ravel()
            r2 = res[1:, :].ravel()
            std1, std2 = np.std(r1), np.std(r2)
            if std1 > 1e-6 and std2 > 1e-6:
                ac = float(np.mean((r1 - np.mean(r1)) * (r2 - np.mean(r2))) / (std1 * std2 + 1e-8))
            else:
                ac = 0.0
        else:
            ac = 0.0
        return float(np.clip(ac, -1.0, 1.0))

    def extract_diagnostics(self, image: Image.Image) -> dict:
        """
        Extracts 128-d forensic vector along with intermediate 2D diagnostic maps:
        - 2D-FFT log-magnitude spectrum (H, W)
        - 1D radial azimuthal profile (64,)
        - 2D SRM noise residual map (H, W)
        - Native sensor noise autocorrelation
        """
        image_rgb = image.convert("RGB").resize((224, 224), Image.Resampling.BILINEAR)
        img_arr = np.asarray(image_rgb, dtype=np.float32) / 255.0

        # FFT
        gray = rgb_to_gray(img_arr)
        fft = np.fft.fft2(gray)
        fft_shifted = np.fft.fftshift(fft)
        magnitude = np.log1p(np.abs(fft_shifted))
        radial_profile = compute_azimuthal_average(magnitude, num_bins=self.fft_bins)

        # Noise
        residuals = []
        for c in range(3):
            ch = img_arr[:, :, c]
            denoised = scipy.ndimage.median_filter(ch, size=3)
            residuals.append(ch - denoised)
        gray_res = rgb_to_gray(np.stack(residuals, axis=-1))
        noise_feats = extract_noise_features(img_arr, target_dim=self.noise_dims)

        forensic_vector = np.concatenate([radial_profile, noise_feats]).astype(np.float32)
        native_ac = self.compute_native_sensor_autocorrelation(image)

        return {
            "forensic_vector": forensic_vector,
            "fft_spectrum_2d": magnitude,
            "radial_profile": radial_profile,
            "noise_residual_2d": gray_res,
            "native_sensor_autocorr": native_ac,
        }

    def extract_from_tensor_batch(self, tensors: torch.Tensor) -> torch.Tensor:
        """
        Extracts forensic features for a batch of PyTorch image tensors (B, C, H, W).
        Input values expected in range [0, 1] or normalized.
        Returns: torch.Tensor of shape (B, 128)
        """
        device = tensors.device
        batch_size = tensors.shape[0]
        feature_list = []

        # Convert tensors to CPU numpy for scipy/fft operations
        tensors_np = tensors.detach().cpu().numpy()
        clip_mean = np.array([0.48145466, 0.4578275, 0.40821073], dtype=np.float32)
        clip_std = np.array([0.26862954, 0.26130258, 0.27577711], dtype=np.float32)

        for i in range(batch_size):
            img_chw = tensors_np[i]
            # Transpose (C, H, W) -> (H, W, C)
            img_hwc = np.transpose(img_chw, (1, 2, 0))
            # Rescale if normalized with standard CLIP mean/std (values outside [0, 1])
            if img_hwc.min() < -0.05 or img_hwc.max() > 1.05:
                img_hwc = img_hwc * clip_std + clip_mean
            img_hwc = np.clip(img_hwc, 0.0, 1.0)

            fft_f = extract_fft_features(img_hwc, num_bins=self.fft_bins)
            noise_f = extract_noise_features(img_hwc, target_dim=self.noise_dims)
            f_vec = np.concatenate([fft_f, noise_f])
            feature_list.append(f_vec)

        batch_forensic = torch.tensor(np.array(feature_list), dtype=torch.float32, device=device)
        return batch_forensic
