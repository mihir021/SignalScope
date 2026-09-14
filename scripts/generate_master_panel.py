"""
SignalScope - On-Demand Master Diagnostic Dashboard Generator
==============================================================
Generates a 6-panel comprehensive forensic dashboard for any input image:
1. Input Photograph & Resolution Metadata
2. ViT Layer-11 Attention Saliency (Thermal CAM)
3. 2D-FFT Log Frequency Spectrum
4. SRM High-Pass Noise Residual (Sensor Grain)
5. Dual-Brain Neural Breakdown (Visual vs Sensor Gate vs Consensus)
6. Calibrated Decision Verdict & Probabilities

Usage:
    python scripts/generate_master_panel.py <path_to_image> [--output <output_png>]
"""

import os
import sys
# Ensure project root is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import argparse
import shutil
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from PIL import Image, ImageOps

from model.predict import predict_detailed, classifier
from model.explain import ExplainabilityPipeline
from model.forensic import ForensicExtractor


def generate_panel(image_path: str, output_path: str = None, title: str = None):
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found at '{image_path}'")

    img_raw = Image.open(image_path)
    img = ImageOps.exif_transpose(img_raw).convert("RGB")
    w, h = img.size

    base_name = os.path.splitext(os.path.basename(image_path))[0]
    if title is None:
        title = base_name.replace("_", " ").upper()
    if output_path is None:
        output_path = os.path.join("report", "inspections", f"{base_name}_master_panel.png")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    print(f"--> Analyzing '{image_path}' ({w}x{h} px)...")

    # 1. Full detailed prediction with forensic-gated consensus
    detailed = predict_detailed(image_path)

    # 2. Saliency Heatmap Overlay (reused directly from predict_detailed)
    import base64
    overlay_bytes = base64.b64decode(detailed["overlay_base64"])
    overlay_img = Image.open(io.BytesIO(overlay_bytes)).convert("RGB")

    # 3. Forensic Diagnostics (FFT + SRM)
    extractor = ForensicExtractor()
    diag = extractor.extract_diagnostics(img)

    # Scores
    p_real = detailed["probabilities"]["real"] * 100
    p_fake = detailed["probabilities"]["fake"] * 100
    p_vis_fake = detailed["stream_scores"]["visual_fake"] * 100
    p_sensor_fake = detailed["stream_scores"]["sensor_fake"] * 100
    sensor_ac = detailed["sensor_autocorr"]
    conf = detailed["confidence"] * 100
    verdict = detailed["verdict"]

    print(f"\n==================== FORENSIC REPORT: {title} ====================")
    print(f"Official Verdict:      {verdict}")
    print(f"Confidence:            {conf:.2f}% ({detailed['certainty_tier'].upper()})")
    print(f"Calibrated Real / Fake: {p_real:.2f}% Real | {p_fake:.2f}% Fake")
    print(f"Brain 1 (Visual CLIP):  {p_vis_fake:.2f}% Fake")
    print(f"Brain 2 (Sensor Gate):  {p_sensor_fake:.2f}% Fake (AC: {sensor_ac:+.4f})")
    if detailed.get("advisory"):
        print(f"Active Advisory:       {detailed['advisory']}")
    if detailed.get("attribution"):
        fam = detailed["attribution"].get("predicted_family", detailed["attribution"].get("family", "Unknown"))
        print(f"Generator Attribution: {fam} ({detailed['attribution']['confidence']*100:.1f}%)")
    print(f"===================================================================\n")

    # 4. Build 2-Row Master Dashboard (2x3)
    fig = plt.figure(figsize=(22, 12))
    gs = fig.add_gridspec(2, 3, height_ratios=[1, 1], hspace=0.32, wspace=0.25)

    is_fake = detailed["label"] == "fake"
    header_color = "#e74c3c" if (is_fake and not detailed.get("is_borderline")) else ("#e67e22" if detailed.get("is_borderline") else "#27ae60")

    fig.suptitle(
        f"SignalScope Master Forensic Dashboard: {title}\n"
        f"Official Verdict: {verdict.upper()} | Calibrated Confidence: {conf:.2f}% | Certainty: {detailed['certainty_tier'].upper()}",
        fontsize=15, fontweight="bold", color=header_color, y=0.98
    )

    # Panel 1: Original Image
    ax1 = fig.add_subplot(gs[0, 0])
    ax1.imshow(img)
    ax1.set_title(f"1. Input Photograph\nResolution: {w} x {h} px", fontsize=11, fontweight="bold")
    ax1.axis("off")

    # Panel 2: ViT Attention Saliency
    ax2 = fig.add_subplot(gs[0, 1])
    ax2.imshow(overlay_img)
    ax2.set_title("2. ViT Attention Saliency (Layer 11)\nSpatial Attention & Feature Concentration", fontsize=11, fontweight="bold")
    ax2.axis("off")

    # Panel 3: 2D-FFT Log Frequency Spectrum
    ax3 = fig.add_subplot(gs[0, 2])
    fft_map = np.array(diag["fft_spectrum_2d"])
    ax3.imshow(fft_map, cmap="magma")
    spec_ratio = detailed.get("explanation_cues", {}).get("spectral_ratio", 0.43)
    ax3.set_title(f"3. 2D-FFT Log Power Spectrum\nFrequency Ratio: {spec_ratio:.3f}", fontsize=11, fontweight="bold")
    ax3.axis("off")

    # Panel 4: SRM Noise Residual Map
    ax4 = fig.add_subplot(gs[1, 0])
    noise_map = np.array(diag["noise_residual_2d"])
    ax4.imshow(noise_map, cmap="gray")
    noise_var = detailed.get("explanation_cues", {}).get("noise_variance", 0.0003)
    ax4.set_title(f"4. SRM Noise Residual (PRNU Sensor Grain)\nSensor AC: {sensor_ac:+.4f} | Noise Var: {noise_var:.5f}", fontsize=11, fontweight="bold")
    ax4.axis("off")

    # Panel 5: Dual-Brain Decomposition
    ax5 = fig.add_subplot(gs[1, 1])
    brains = ["Brain 1 (Visual)\nCLIP ViT-B/16", "Brain 2 (Sensor)\nPhysical Noise AC", "Consensus Verdict\n(Forensic-Gated)"]
    scores = [p_vis_fake, p_sensor_fake, p_fake]
    b_colors = ["#3498db", "#2ecc71", header_color]
    bars = ax5.bar(brains, scores, color=b_colors, width=0.48)
    ax5.set_ylim(0, 105)
    ax5.axhline(50, color="gray", linestyle="--", alpha=0.6, label="Decision Threshold (50%)")
    ax5.set_ylabel("AI Suspicion Probability (%)", fontsize=10)
    ax5.set_title(f"5. Dual-Brain Neural Breakdown\nPhysical Sensor Gate: {sensor_ac:+.4f} (|ρ| < 0.08 = Real CMOS)", fontsize=11, fontweight="bold")
    for b in bars:
        y = b.get_height()
        ax5.text(b.get_x() + b.get_width() / 2.0, y + 2, f"{y:.1f}%", ha="center", va="bottom", fontweight="bold")
    ax5.legend(loc="upper right", fontsize=8)

    # Panel 6: Final Calibrated Probabilities
    ax6 = fig.add_subplot(gs[1, 2])
    classes = ["Likely Authentic\n(REAL)", "Likely AI-Generated\n(SYNTHETIC)"]
    probs = [p_real, p_fake]
    p_colors = ["#2ecc71", "#e74c3c"] if not detailed.get("is_borderline") else ["#2ecc71", "#e67e22"]
    bars6 = ax6.bar(classes, probs, color=p_colors, width=0.45)
    ax6.set_ylim(0, 108)
    ax6.set_ylabel("Calibrated Probability (%)", fontsize=10)
    ax6.set_title(f"6. Final Calibrated Verdict\nThreshold: 50.0% | Certainty: {detailed['certainty_tier'].upper()}", fontsize=11, fontweight="bold")
    for b in bars6:
        y = b.get_height()
        ax6.text(b.get_x() + b.get_width() / 2.0, y + 2, f"{y:.2f}%", ha="center", va="bottom", fontweight="bold")

    plt.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"[OK] Master dashboard generated: {output_path}")

    return output_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate SignalScope Master Diagnostic Dashboard for an image")
    parser.add_argument("image_path", type=str, help="Path to input image")
    parser.add_argument("--output", type=str, default=None, help="Path to output PNG")
    parser.add_argument("--title", type=str, default=None, help="Display title on the dashboard")
    args = parser.parse_args()

    generate_panel(args.image_path, args.output, args.title)
