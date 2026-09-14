# API Response Format

## Detailed Prediction Overlay

`POST /predict/detailed` no longer returns `overlay_base64` by default. The field is a full heatmap image encoded as a base64 string, so it can make terminal output very large and hard to read.

The default detailed response still includes the readable explanation fields:

- `filename`
- `label`
- `verdict`
- `confidence`
- `probabilities`
- `explanation_cues`
- `explanation_summary`
- `attribution`, when available
- `exif_metadata`, when available
- `multimodal_match`, when a caption is provided
- `status`

To get the normal readable output:

```powershell
curl.exe -X POST "http://localhost:8000/predict/detailed" `
  -H "accept: application/json" `
  -F "file=@C:\Storage\sem_4\pyton_project\SIH\SignalScope\tests\test_image.png"
```

To request the heatmap image string when a frontend or script needs it:

```powershell
curl.exe -X POST "http://localhost:8000/predict/detailed?include_overlay=true" `
  -H "accept: application/json" `
  -F "file=@C:\Storage\sem_4\pyton_project\SIH\SignalScope\tests\test_image.png"
```

When `include_overlay=true`, the response includes `overlay_base64`. That value must be decoded by a frontend or helper script to display the heatmap image.
