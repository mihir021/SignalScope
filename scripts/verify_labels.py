"""
SignalScope - Defactify Label & Metadata Verification Script
============================================================
Inspects samples from Rajarshi-Roy-research/Defactify_Image_Dataset
to provide irrefutable evidence of the mapping for:
- Label_A (binary real vs fake)
- Label_B (generator family)
- Image properties & captions
"""

import os
from datasets import load_dataset
from PIL import Image

def verify():
    print("Loading Defactify validation split from local cache...")
    ds = load_dataset("Rajarshi-Roy-research/Defactify_Image_Dataset", split="validation")

    samples_0 = []
    samples_1 = []

    for i in range(len(ds)):
        item = ds[i]
        if item["Label_A"] == 0 and len(samples_0) < 10:
            samples_0.append((i, item))
        elif item["Label_A"] == 1 and len(samples_1) < 10:
            samples_1.append((i, item))
        if len(samples_0) >= 10 and len(samples_1) >= 10:
            break

    print("\n" + "=" * 90)
    print("SAMPLES WHERE Label_A == 0 (Candidate REAL)")
    print("=" * 90)
    for idx, item in samples_0:
        caption = item.get("Caption", "").strip().replace("\n", " ")
        print(f"Index: {idx:4d} | Label_A: {item['Label_A']} | Label_B (Generator ID): {item['Label_B']} | Caption: {caption}")

    print("\n" + "=" * 90)
    print("SAMPLES WHERE Label_A == 1 (Candidate FAKE / SYNTHETIC)")
    print("=" * 90)
    for idx, item in samples_1:
        caption = item.get("Caption", "").strip().replace("\n", " ")
        print(f"Index: {idx:4d} | Label_A: {item['Label_A']} | Label_B (Generator ID): {item['Label_B']} | Caption: {caption}")

    # Check distribution of Label_B when Label_A == 0 vs Label_A == 1
    label_b_when_a_0 = set(x[1]["Label_B"] for x in samples_0)
    label_b_when_a_1 = set(x[1]["Label_B"] for x in samples_1)

    print("\n" + "=" * 90)
    print("LABEL_B (GENERATOR IDENTITY) CORRELATION SUMMARY:")
    print("=" * 90)
    print(f"Unique Label_B values when Label_A == 0: {sorted(list(label_b_when_a_0))}")
    print(f"Unique Label_B values when Label_A == 1: {sorted(list(label_b_when_a_1))}")

    # Save visual verification images
    os.makedirs("report", exist_ok=True)
    if samples_0:
        img_0 = samples_0[0][1].get("Image", samples_0[0][1].get("image"))
        if not isinstance(img_0, Image.Image):
            img_0 = Image.fromarray(img_0)
        img_0.save("report/label_check_sample_label0.png")
        print(f"\nSaved sample with Label_A=0 to: report/label_check_sample_label0.png (Size: {img_0.size})")

    if samples_1:
        img_1 = samples_1[0][1].get("Image", samples_1[0][1].get("image"))
        if not isinstance(img_1, Image.Image):
            img_1 = Image.fromarray(img_1)
        img_1.save("report/label_check_sample_label1.png")
        print(f"Saved sample with Label_A=1 to: report/label_check_sample_label1.png (Size: {img_1.size})")

if __name__ == "__main__":
    verify()
