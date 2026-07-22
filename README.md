# BoveCloset — 2D virtual try-on

Upload a full-body photo of yourself and photos of your garments, and see the clothes
on yourself using [IDM-VTON](https://huggingface.co/spaces/yisol/IDM-VTON).

- **Avatar photos** are stored as-is (auto-oriented and downscaled). IDM-VTON does its own
  human parsing, so no background removal is applied.
- **Garment photos** have their background removed locally
  (`@imgly/background-removal-node`), are validated from the resulting mask, and are stored
  as both the original and a transparent cutout.
- Every garment is one of exactly four categories: **shirt, dress, shorts, pants**
  (single source of truth: `lib/garments.ts` on the server, `mobile/src/models/closet.ts`
  on the client).
- Images live in **Cloudflare R2** (private bucket, presigned GET URLs). Metadata lives in
  a local **SQLite** database (`node:sqlite`).

## Run it locally

```bash
npm install            # root backend deps
npm --prefix mobile install
cp .env.example .env   # then fill in the R2_* values
npm run dev            # backend + Expo together
```

Backend output is prefixed with `[backend]`; Expo keeps its interactive terminal (QR code,
simulator shortcuts). To run only the backend:

```bash
npm run dev:server     # http://localhost:5173
```

## Backend API

| Method & path            | Body                              | Returns                       |
| ------------------------ | --------------------------------- | ----------------------------- |
| `POST /api/avatar`       | multipart: `image`, `userId`      | `{ avatarUrl }`               |
| `GET  /api/avatar`       | `?userId=`                        | `{ avatarUrl \| null }`       |
| `POST /api/garments`     | multipart: `image`, `category`, `name?`, `destination?`, `userId` | `WardrobeItem` |
| `GET  /api/garments`     | `?userId=`                        | `WardrobeItem[]`              |
| `POST /api/try-on`       | JSON: `{ userId, garmentId }`     | `{ resultUrl }`               |

Try-on is synchronous and can take 30–60s (IDM-VTON queue + inference). The garment cutout
is composited onto solid white before it is sent, so Gradio does not flatten the alpha
channel to black.

## Configuration

All secrets are backend-only and read from `.env` (gitignored). The mobile app only ever
knows the backend URL via Expo config. See `.env.example` for the full list:

```bash
R2_ACCOUNT_ID=            # https://<id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
BG_REMOVAL_MODEL=isnet-general-use   # mapped to the local model; swappable
IDM_VTON_SPACE=yisol/IDM-VTON
APP_DB_PATH=./data/app.db
```

## Tests

```bash
npm test               # node --test: upload, dedup, mask-validation, R2 stubbed
```
