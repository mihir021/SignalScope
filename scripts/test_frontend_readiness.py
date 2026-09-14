"""
SignalScope Frontend Readiness Verification Script
=================================================
Tests backend + model inference across manual test images in report/inspections/
Outputs:
- Request latencies (ms)
- Full JSON response schemas and payloads
- Verification of both /predict and /predict/detailed
- Verification of overlay toggle (?include_overlay=true/false)
- Multimodal caption matching
"""

import os
import sys
sys.path.insert(0, ".")
import time
import json
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

TEST_DIR = os.path.join("report", "inspections")
test_files = [
    "user_astronaut_cat.png",
    "test_cat_cobblestone.jpg",
    "test_child_sunglasses.jpg",
    "user_lens_sample.png",
    "user_person_portrait.jpg",
    "user_rainy_portrait.jpg"
]

results = []

print("=" * 80)
print("SIGNALSCOPE BACKEND & MODEL READINESS AUDIT FOR FRONTEND PAIRING")
print("=" * 80)

# Warmup call
warmup_file = os.path.join(TEST_DIR, test_files[0])
if os.path.exists(warmup_file):
    with open(warmup_file, "rb") as f:
        client.post("/predict", files={"file": ("warmup.png", f.read(), "image/png")})

for fname in test_files:
    fpath = os.path.join(TEST_DIR, fname)
    if not os.path.exists(fpath):
        continue
    
    file_size_kb = round(os.path.getsize(fpath) / 1024, 1)
    mime = "image/png" if fname.endswith(".png") else "image/jpeg"
    with open(fpath, "rb") as f:
        img_bytes = f.read()

    # 1. Test POST /predict (Standard fast endpoint)
    t0 = time.perf_counter()
    res_standard = client.post("/predict", files={"file": (fname, img_bytes, mime)})
    lat_standard_ms = round((time.perf_counter() - t0) * 1000, 1)
    
    # 2. Test POST /predict/detailed (Detailed without overlay)
    t0 = time.perf_counter()
    res_detailed = client.post("/predict/detailed", files={"file": (fname, img_bytes, mime)})
    lat_detailed_ms = round((time.perf_counter() - t0) * 1000, 1)

    # 3. Test POST /predict/detailed?include_overlay=true (With overlay base64)
    t0 = time.perf_counter()
    res_overlay = client.post("/predict/detailed?include_overlay=true", files={"file": (fname, img_bytes, mime)})
    lat_overlay_ms = round((time.perf_counter() - t0) * 1000, 1)

    # 4. Test Multimodal with caption
    res_multimodal = client.post(
        "/predict", 
        files={"file": (fname, img_bytes, mime)},
        data={"caption": "A realistic photo of high quality"}
    )
    data_mm = res_multimodal.json()
    clip_sim = data_mm.get("multimodal_consistency", {}).get("image_text_cosine_similarity")

    data_std = res_standard.json()
    data_det = res_detailed.json()
    data_ov = res_overlay.json()

    overlay_len = len(data_ov.get("overlay_base64", "")) if "overlay_base64" in data_ov else 0

    item_summary = {
        "file": fname,
        "size_kb": file_size_kb,
        "status_code": res_standard.status_code,
        "label": data_std.get("label"),
        "confidence": data_std.get("confidence"),
        "latency_standard_ms": lat_standard_ms,
        "latency_detailed_ms": lat_detailed_ms,
        "latency_overlay_ms": lat_overlay_ms,
        "attribution_family": data_std.get("generator_attribution", {}).get("predicted_family") if data_std.get("generator_attribution") else None,
        "explanation_summary": data_det.get("explanation_summary"),
        "hotspot_region": data_det.get("explanation_cues", {}).get("hotspot_region"),
        "overlay_base64_chars": overlay_len,
        "clip_similarity": clip_sim,
        "sample_detailed_keys": list(data_det.keys())
    }
    results.append(item_summary)

    print(f"\n[{fname}] ({file_size_kb} KB)")
    print(f"  Standard Predict:  Label={item_summary['label']} | Conf={item_summary['confidence']} | Latency={lat_standard_ms} ms")
    print(f"  Detailed Predict:  Latency={lat_detailed_ms} ms | Hotspot={item_summary['hotspot_region']}")
    print(f"  Overlay Predict:   Latency={lat_overlay_ms} ms | Base64 size={overlay_len} chars")
    if item_summary['attribution_family']:
        print(f"  Generator Family:  {item_summary['attribution_family']}")
    print(f"  Explanation:       {item_summary['explanation_summary']}")
    if clip_sim is not None:
        print(f"  Multimodal Sim:    {clip_sim}")

# Save full verification JSON
with open(os.path.join("report", "frontend_readiness_audit.json"), "w", encoding="utf-8") as f:
    json.dump({
        "summary": results,
        "sample_standard_response": data_std,
        "sample_detailed_response": data_det,
        "sample_overlay_response_keys": list(data_ov.keys())
    }, f, indent=2)

print("\n" + "=" * 80)
print("AUDIT COMPLETE - Results saved to report/frontend_readiness_audit.json")
print("=" * 80)
