# Whole-Image Content Summary & Scene Description API

**Endpoints:**  
- `POST /image/summary`  
- `POST /describe` *(alias)*  

---

## 1. Problem & Motivation

In SignalScope's Phase 3 explainability engine, spatial attention rollout localizes high-saliency anomalies where diffusion models introduce subtle deconvolution artifacts, boundary smoothing, or PRNU noise suppression.

### The "Tiny Heatmap" Challenge
When an image is synthetically generated, the model's highest-saliency heatmap activation is often concentrated on a **very tiny local patch** (e.g., a tiny deconvolution grid imperfection, a pupil reflection flaw, or a small finger anomaly measuring only a few pixels).

While crop-based region captioning (`hotspot_content`) works well when the anomaly covers a prominent subject, a tiny $15 \times 15$ pixel hotspot crop:
1. May capture only an ambiguous micro-texture rather than the overall subject.
2. Does not inform the human forensic analyst what the **overall image** actually depicts (e.g., whether the image is a portrait of a lion, a city street, a landscape, or a human face).

To provide holistic context and complement the localized forensic heatmap, SignalScope provides a dedicated **Whole-Image Summary API** (`POST /image/summary` / `POST /describe`) that analyzes the complete scene composition.

---

## 2. Technical Architecture

The Whole-Image Summary API operates with **zero added model weight overhead** by reusing the frozen **CLIP ViT-B/16 backbone** (`openai/clip-vit-base-patch16`) already loaded in memory by the SignalScope dual-stream classifier.

### Multi-Faceted Decomposition
When an image is submitted to `/image/summary`:
1. **Full-Canvas Visual Embedding:** The entire image is transformed and encoded into a 512-dimensional normalized visual vector:
   $$\mathbf{v}_{img} = \frac{\text{VisionEncoder}(I)}{\|\text{VisionEncoder}(I)\|_2}$$
2. **Tri-Domain Semantic Ranking:** $\mathbf{v}_{img}$ is evaluated simultaneously against three specialized, pre-cached prompt vocabularies:
   - **Object & Subject Bank (41 concepts):** Identifies primary entities (humans, animals, vehicles, flora, everyday objects).
   - **Scene Environment Bank (9 environments):** Identifies setting (wilderness nature, urban street, domestic room, studio portrait, ocean/water, etc.).
   - **Style & Medium Bank (7 styles):** Classifies visual medium (realistic photo, portrait photo, wide-angle landscape, digital illustration, 3D render, macro close-up).
3. **Natural-Language Synthesis:** The top-ranked concepts from all three domains are dynamically composed into a fluent, contextual narrative:
   > *"This image appears to be [detected_style] primarily featuring [primary_subject], situated in [scene_type]. Additional detected elements include [secondary_cues]."*

---

## 3. API Specification

### Request
- **Method:** `POST`
- **Paths:** `/image/summary` or `/describe`
- **Content-Type:** `multipart/form-data`
- **Parameters:**
  - `file`: Image binary (`image/png`, `image/jpeg`, `image/webp`).

### Response Schema

| Field | Type | Description |
|---|---|---|
| `filename` | `string` | Uploaded image filename |
| `status` | `string` | `"success"` or error status |
| `summary` | `string` | Coherent natural language narrative describing the full image scene |
| `primary_subject` | `string` | Best matching subject concept |
| `subject_confidence` | `float` | Cosine similarity score for the primary subject $[0.0, 1.0]$ |
| `scene_type` | `string` | Categorized scene setting |
| `detected_style` | `string` | Categorized visual style or medium |
| `top_detected_concepts` | `array` | Top-5 ranked entities with individual confidence scores |
| `method` | `string` | `"clip_zero_shot"` (or `"fallback"`) |

---

## 4. Example Usage

### PowerShell (Windows)

```powershell
curl.exe -X POST "http://localhost:8000/image/summary" `
  -H "accept: application/json" `
  -F "file=@tests/test_image.png"
```

### cURL (Linux / macOS)

```bash
curl -X POST "http://localhost:8000/image/summary" \
  -H "accept: application/json" \
  -F "file=@tests/test_image.png"
```

### Sample Response

```json
{
  "filename": "test_image.png",
  "status": "success",
  "summary": "This image appears to be a studio portrait setting with neutral background primarily featuring human skin texture with elements of a human face, a person's eyes and eyebrows, situated in a studio portrait setting with neutral background.",
  "primary_subject": "human skin texture",
  "subject_confidence": 0.8124,
  "scene_type": "a studio portrait setting with neutral background",
  "detected_style": "a realistic photographic capture",
  "top_detected_concepts": [
    {
      "concept": "human skin texture",
      "confidence": 0.8124
    },
    {
      "concept": "a human face",
      "confidence": 0.7689
    },
    {
      "concept": "a person's eyes and eyebrows",
      "confidence": 0.6942
    },
    {
      "concept": "a person's mouth and teeth",
      "confidence": 0.5810
    },
    {
      "concept": "a person's nose",
      "confidence": 0.5218
    }
  ],
  "method": "clip_zero_shot"
}
```

---

## 5. Python Client Example

```python
import requests

url = "http://localhost:8000/image/summary"

with open("tests/test_image.png", "rb") as f:
    files = {"file": ("test_image.png", f, "image/png")}
    response = requests.post(url, files=files)

data = response.json()
print("Scene Summary:", data["summary"])
print("Primary Subject:", data["primary_subject"])
print("Style:", data["detected_style"])
```

---

## 6. Integration with SignalScope Workflow

| Endpoint | Primary Use Case | Scope |
|---|---|---|
| `POST /predict` | Fast binary classification (Real vs Synthetic) | 640-d fused embeddings |
| `POST /predict/detailed` | Full forensic analysis + attention rollout heatmap + localized hotspot cues | Forensic pixel cues & high-saliency crop |
| `POST /image/summary` | Global semantic understanding & scene description | Complete full-canvas scene context |
