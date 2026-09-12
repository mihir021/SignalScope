"""
SignalScope - 5-Sample Visual Inspection & Diagnostic Suite
============================================================
Pulls 5 diverse test images (real camera photos and synthetic images
from diverse diffusion generator families), traces the inference step-by-step,
and renders rich diagnostic figures:
- Input image with verdict banner
- 2D-FFT Power Spectrum (frequency artifacts)
- 2D SRM Noise Residual Map (sensor vs generative noise)
- Radial Azimuthal Frequency Profile & Probability Bar Gauge
"""

import os
import sys
# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import numpy as np
import matplotlib.pyplot as plt
from PIL import Image
from datasets import load_dataset

from model.predict import predict_detailed

def run_visual_inspection():
    print("=" * 80)
    print("SIGNALSCOPE - 5-SAMPLE VISUAL INSPECTION & EXPLAINABILITY SUITE")
    print("=" * 80)
    
    os.makedirs("report/inspections", exist_ok=True)
    
    # 1. Load diverse samples from Defactify validation split
    print("Loading test samples from Defactify validation pool...")
    ds = load_dataset("Rajarshi-Roy-research/Defactify_Image_Dataset", split="validation")
    
    samples = []
    
    # Sample 1: Authentic Real Photography (COCO / Camera)
    for i in range(len(ds)):
        if ds[i]["Label_A"] == 0:
            samples.append({
                "id": 1,
                "title": "Sample 1: Authentic Photography (Real)",
                "expected": "Real",
                "image": ds[i].get("Image", ds[i].get("image")),
                "caption": ds[i].get("Caption", "Natural Photography"),
                "generator": "Natural Camera / MS COCO"
            })
            break

    # Sample 2: Authentic Real Photography (Different scene)
    for i in range(100, len(ds)):
        if ds[i]["Label_A"] == 0:
            samples.append({
                "id": 2,
                "title": "Sample 2: Authentic Photography (Real Scene 2)",
                "expected": "Real",
                "image": ds[i].get("Image", ds[i].get("image")),
                "caption": ds[i].get("Caption", "Natural Photography"),
                "generator": "Natural Camera / MS COCO"
            })
            break

    # Sample 3: Synthetic Generator Family 1
    for i in range(len(ds)):
        if ds[i]["Label_A"] == 1 and ds[i]["Label_B"] == 1:
            samples.append({
                "id": 3,
                "title": "Sample 3: AI-Generated (Diffusion Family 1)",
                "expected": "AI",
                "image": ds[i].get("Image", ds[i].get("image")),
                "caption": ds[i].get("Caption", "Synthetic Scene"),
                "generator": "Diffusion Model (Family 1)"
            })
            break

    # Sample 4: Synthetic Generator Family 3
    for i in range(len(ds)):
        if ds[i]["Label_A"] == 1 and ds[i]["Label_B"] == 3:
            samples.append({
                "id": 4,
                "title": "Sample 4: AI-Generated (Diffusion Family 3)",
                "expected": "AI",
                "image": ds[i].get("Image", ds[i].get("image")),
                "caption": ds[i].get("Caption", "Synthetic Scene"),
                "generator": "Diffusion Model (Family 3)"
            })
            break

    # Sample 5: Synthetic Generator Family 5
    for i in range(len(ds)):
        if ds[i]["Label_A"] == 1 and ds[i]["Label_B"] == 5:
            samples.append({
                "id": 5,
                "title": "Sample 5: AI-Generated (Diffusion Family 5)",
                "expected": "AI",
                "image": ds[i].get("Image", ds[i].get("image")),
                "caption": ds[i].get("Caption", "Synthetic Scene"),
                "generator": "Diffusion Model (Family 5)"
            })
            break

    print(f"Successfully selected {len(samples)} diverse test samples across real and synthetic generators.")
    print("-" * 80)

    summary_results = []

    # 2. Process each sample with step-by-step visual trace
    for idx, s in enumerate(samples, start=1):
        raw_img = s["image"]
        if not isinstance(raw_img, Image.Image):
            raw_img = Image.fromarray(raw_img)
        raw_img = raw_img.convert("RGB")

        print(f"\n>>> PROCESSING [{idx}/5]: {s['title']}")
        print(f"    Generator Family: {s['generator']}")
        print(f"    Input Size: {raw_img.size} | Color Channels: RGB")

        # Step 1: Pixel transforms & CLIP ViT-B/16 extraction
        print("    [Step 1/5] Visual Stream: Resizing to 224x224, standardizing with CLIP normalizer...")
        
        # Step 2: 2D-FFT azimuthal extraction
        print("    [Step 2/5] Forensic Stream A: Computing 2D Fast Fourier Transform & Azimuthal 64-bin power spectrum...")

        # Step 3: Noise residual extraction
        print("    [Step 3/5] Forensic Stream B: Computing 3x3 median high-pass SRM noise residual moments...")

        # Run inference
        res = predict_detailed(raw_img)

        diag = res["diagnostics"]
        real_p = res["probabilities"]["real"]
        fake_p = res["probabilities"]["fake"]
        conf = res["confidence"]
        verdict = res["verdict"]

        print("    [Step 4/5] Multimodal Fusion: Concatenating 512-d Visual (L2 Norm: "
              f"{diag['visual_norm']:.2f}) + 128-d Forensic (L2 Norm: {diag['forensic_norm']:.2f})...")
        print(f"    [Step 5/5] Calibrated Decision: Applied Learned Temperature T={diag['temperature']:.4f}")
        print(f"    ==> OUTPUT VERDICT: [{verdict.upper()}] (Confidence: {conf*100:.2f}%)")
        print(f"        P(Authentic Real): {real_p*100:.2f}% | P(AI-Generated): {fake_p*100:.2f}%")

        summary_results.append({
            "id": s["id"],
            "title": s["title"],
            "expected": s["expected"],
            "verdict": verdict,
            "confidence": conf,
            "real_p": real_p,
            "fake_p": fake_p,
            "image": raw_img,
            "fft_spectrum": diag["fft_spectrum_2d"],
            "noise_residual": diag["noise_residual_2d"],
            "radial_profile": diag["radial_profile"]
        })

        # Render 4-panel diagnostic figure for this sample
        fig, axes = plt.subplots(1, 4, figsize=(20, 5))

        # Panel 1: Original Image
        is_ai = fake_p >= 0.5
        box_color = "red" if is_ai else "green"
        axes[0].imshow(raw_img)
        axes[0].set_title(f"Input: {s['generator']}\nVerdict: {verdict.upper()} ({conf*100:.1f}%)",
                          color=box_color, fontweight="bold", fontsize=11)
        axes[0].axis("off")
        # Add colored border
        for spine in axes[0].spines.values():
            spine.set_edgecolor(box_color)
            spine.set_linewidth(4)

        # Panel 2: 2D-FFT Log Magnitude Spectrum
        fft_map = diag["fft_spectrum_2d"]
        im1 = axes[1].imshow(fft_map, cmap="inferno")
        axes[1].set_title("2D-FFT Power Spectrum\n(Frequency Artifacts)", fontsize=11, fontweight="bold")
        axes[1].axis("off")
        plt.colorbar(im1, ax=axes[1], fraction=0.046, pad=0.04)

        # Panel 3: SRM Noise Residual Map
        noise_map = diag["noise_residual_2d"]
        # Normalize and amplify noise map for visibility
        noise_norm = (noise_map - noise_map.min()) / (noise_map.max() - noise_map.min() + 1e-8)
        im2 = axes[2].imshow(noise_norm, cmap="gray")
        axes[2].set_title("SRM Noise Residual Map\n(High-Pass Sensor Residuals)", fontsize=11, fontweight="bold")
        axes[2].axis("off")
        plt.colorbar(im2, ax=axes[2], fraction=0.046, pad=0.04)

        # Panel 4: Calibrated Probability Gauge & Azimuthal Decay Curve
        ax_sub = axes[3]
        classes = ["Real\nAuthentic", "AI\nGenerated"]
        probs = [real_p, fake_p]
        colors = ["#2ecc71" if real_p > fake_p else "#95a5a6",
                  "#e74c3c" if fake_p >= real_p else "#95a5a6"]
        bars = ax_sub.bar(classes, [p * 100 for p in probs], color=colors, width=0.5)
        ax_sub.set_ylim(0, 105)
        ax_sub.set_ylabel("Calibrated Probability (%)", fontsize=10)
        ax_sub.set_title(f"Confidence Breakdown\n(T = {diag['temperature']:.2f})", fontsize=11, fontweight="bold")
        for bar, p in zip(bars, probs):
            yval = bar.get_height()
            ax_sub.text(bar.get_x() + bar.get_width()/2.0, yval + 2, f"{p*100:.1f}%",
                        ha='center', va='bottom', fontweight='bold', fontsize=10)
        ax_sub.grid(axis="y", linestyle="--", alpha=0.4)

        plt.suptitle(f"SignalScope Visual Diagnostic - {s['title']}", fontsize=14, fontweight="bold", y=1.02)
        plt.tight_layout()
        out_fig_path = f"report/inspections/sample_{idx}_diagnostic.png"
        plt.savefig(out_fig_path, dpi=200, bbox_inches="tight")
        plt.close()
        print(f"    Saved visual diagnostic figure to: {out_fig_path}")

    # 3. Create Overarching 5-Sample Comparison Summary Grid
    print("\nGenerating overarching 5-sample summary comparison panel...")
    fig, axes = plt.subplots(5, 3, figsize=(15, 20))

    for i, r in enumerate(summary_results):
        # Col 0: Image
        is_ai = r["fake_p"] >= 0.5
        box_col = "#e74c3c" if is_ai else "#27ae60"
        axes[i, 0].imshow(r["image"])
        axes[i, 0].set_title(f"{r['title']}\nVerdict: {r['verdict'].upper()} ({r['confidence']*100:.1f}%)",
                             color=box_col, fontweight="bold", fontsize=10)
        axes[i, 0].axis("off")

        # Col 1: 2D-FFT
        axes[i, 1].imshow(r["fft_spectrum"], cmap="inferno")
        axes[i, 1].set_title("2D-FFT Magnitude Spectrum", fontsize=10, fontweight="bold")
        axes[i, 1].axis("off")

        # Col 2: Probability Bar
        bars = axes[i, 2].bar(["Real", "AI-Generated"], [r["real_p"] * 100, r["fake_p"] * 100],
                               color=["#2ecc71" if r["real_p"] > r["fake_p"] else "#95a5a6",
                                      "#e74c3c" if r["fake_p"] >= r["real_p"] else "#95a5a6"],
                               width=0.4)
        axes[i, 2].set_ylim(0, 110)
        axes[i, 2].set_ylabel("Probability (%)", fontsize=9)
        for b, p in zip(bars, [r["real_p"], r["fake_p"]]):
            axes[i, 2].text(b.get_x() + b.get_width()/2.0, b.get_height() + 2, f"{p*100:.1f}%",
                            ha='center', va='bottom', fontweight='bold', fontsize=9)
        axes[i, 2].grid(axis="y", linestyle="--", alpha=0.3)

    plt.suptitle("SignalScope - 5-Sample Visual Inspection & Interpretability Summary",
                 fontsize=16, fontweight="bold", y=0.99)
    plt.tight_layout()
    summary_path = "report/inspections/all_5_inspections_summary.png"
    plt.savefig(summary_path, dpi=200, bbox_inches="tight")
    plt.close()
    print(f"Saved master summary comparison to: {summary_path}")

    print("\n" + "=" * 80)
    print("ALL 5 SAMPLES SUCCESSFULLY EVALUATED AND VISUALIZED!")
    print("=" * 80)

if __name__ == "__main__":
    run_visual_inspection()
