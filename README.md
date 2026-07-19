BoveCloset 3D avatar prototype

This is a first local prototype for the HEAP proposal. The current pass is intentionally focused on the body model before clothing is added back.

The avatar uses centimeter-based body measurements:

- Body type: female or male
- Height
- Build
- Chest
- Waist
- Hips
- Shoulder width
- Inseam
- Arm length

Each measurement can be changed with a slider or typed directly into the number input.

Run it locally:

```bash
npm run dev
```

This starts both the backend API and the Expo mobile app in one terminal. Backend output
is prefixed with `[backend]`; Expo keeps its normal interactive terminal controls for
the QR code, simulator shortcuts, and port prompts.

For the local web prototype only, run:

```bash
npm run dev:server
```

Then open:

```text
http://localhost:5173
```

No install step is required. The prototype uses plain HTML, CSS, JavaScript, and WebGL.

Backend API configuration

The root server now also exposes:

- `POST /api/closet-items`
- `POST /api/try-on`

The root `.env` is for backend-only secrets. The React Native app should only know the
backend API URL through Expo config and should never include provider API keys or the
Supabase service role key.

Set these environment variables before running the real provider pipeline:

```bash
PHOTOROOM_API_KEY=...
PHOTTA_API_KEY=...
PHOTTA_MANNEQUIN_UPLOAD_URL=https://ai.photta.app/api/v1/mannequins/upload
PHOTTA_TRY_ON_URL=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=...
```

Optional overrides:

```bash
OPENAI_VISION_MODEL=gpt-4o
OPENAI_API_KEY=...
PHOTOROOM_BACKGROUND_REMOVAL_URL=https://sdk.photoroom.com/v1/segment
PHOTOROOM_BACKGROUND_FIELD=image_file
PHOTOROOM_WRINKLE_REMOVER_URL=...
WRINKLE_REMOVER_API_URL=...
WRINKLE_REMOVER_API_KEY=...
WRINKLE_REMOVER_FIELD=image_file
PHOTTA_STATUS_URL=...
PHOTTA_DEFAULT_POSE_ID=pose_standing_front
PHOTTA_RESOLUTION=2K
PHOTTA_ASPECT_RATIO=3:4
```

The Supabase table should be named `closet_items` and include columns for `image_url`,
`category`, `subcategory`, `primary_color`, `pattern`, `tags`, `destination`, `user_id`,
and `created_at`.

`OPENAI_API_KEY` is optional. When it is blank, uploads use the selected app tag as the
category and save default metadata.

For one-time Photta mannequin setup, add a `profiles` table:

```sql
create table if not exists public.profiles (
  id text primary key,
  photta_mannequin_id text,
  mannequin_image_url text,
  updated_at timestamptz
);

alter table public.profiles enable row level security;

grant usage on schema public to service_role;
grant select, insert, update, delete on public.profiles to service_role;
```
