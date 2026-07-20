# AI Worker Prototype

Separate Flask prototype for future image-to-3D experiments.

This does not connect to the main Expo/Node app yet. It is intentionally isolated so the
current app cannot crash while the 3D workflow is still experimental.

## What It Does Now

- Accepts an image upload.
- Saves the image in `uploads/`.
- Creates a mock 3D generation job.
- Returns JSON from `/api/generate-3d`.
- Shows a small browser upload page at `/`.

It does not generate a real 3D model yet. The `generate_mock_3d_job` function is the
place to replace later with Meshy, Tripo, Hunyuan3D, TripoSR, Stable Fast 3D, or another
real provider/model.

## Run

```bash
cd ai-worker-prototype
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Open:

```text
http://localhost:7001
```

## API

```bash
curl -X POST http://localhost:7001/api/generate-3d \
  -F "image=@/path/to/clothing-photo.jpg"
```

Response:

```json
{
  "jobId": "...",
  "status": "mock-ready",
  "uploadedImage": "...",
  "modelUrl": null,
  "message": "Image saved. Replace generate_mock_3d_job with a real 3D provider/model."
}
```
