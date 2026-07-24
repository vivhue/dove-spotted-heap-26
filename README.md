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
cp .env.example .env   # then fill in the R2_* values
npm run dev            # installs missing deps, then starts backend + Expo together
```

## Deploy it

To make the app reachable from anywhere, deploy the backend separately and point the mobile app at a public API URL.

1. Deploy `server.ts` to a Node host such as Render, Railway, or Fly.
2. Set the same backend env vars on that host that you use locally in `.env`.
3. Set `EXPO_PUBLIC_API_URL` in the mobile build environment to the public backend URL.
4. Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for mobile auth.
5. Use `render.yaml` as a starting point if you want a simple Render deploy.
6. Build the mobile app with EAS for phone installs, or publish the web build for browser access.

Useful Expo commands:

```bash
npx eas build -p android --profile development
npx eas build -p android --profile preview
npx eas build -p android --profile production
npx eas build -p ios --profile preview
npx eas build -p ios --profile production
```

Backend output is prefixed with `[backend]`; Expo output is prefixed with `[mobile]`.
To run only the backend:

```bash
npm run dev:server     # http://localhost:8080
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

All secrets are backend-only and read from `.env` (gitignored). The mobile app reads its
public backend URL from `EXPO_PUBLIC_API_URL` and its auth config from Expo env vars. See
`.env.example` and `mobile/.env.example` for the full list:

```bash
R2_ACCOUNT_ID=            # https://<id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
BG_REMOVAL_MODEL=isnet-general-use   # mapped to the local model; swappable
IDM_VTON_SPACE=yisol/IDM-VTON
APP_DB_PATH=./data/app.db
```

Mobile public env:

```bash
EXPO_PUBLIC_API_URL=https://your-backend.example.com
EXPO_PUBLIC_R2_UPLOAD_ENDPOINT=https://your-worker.example.com/upload
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

## Tests

```bash
npm test               # node --test: upload, dedup, mask-validation, R2 stubbed
```
