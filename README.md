# SportsBook — sports booking platform

Full-stack app: **Vite + React** frontend, **Express + Prisma** backend.

**Deploy this repo only** (`sports-booking-platform`). It is the consolidated app: admin role verification, Stripe Checkout, platform sport pricing & session length on booking, volunteer listings on Competitions, and owner/sponsor flows.

## Prerequisites

- Node.js 18+
- npm

## Environment variables

### Backend (`backend/.env`)

Copy from `backend/.env.example` and adjust:

| Variable        | Description |
|----------------|-------------|
| `DATABASE_URL` | Prisma connection string. Local default: `file:./dev.db` |
| `JWT_SECRET`   | Secret for signing auth tokens |
| `PORT`         | HTTP port (Render and others set this automatically) |
| `CORS_ORIGIN`  | Comma-separated allowed browser origins (your Vite dev URL, production site URL, and LAN URLs for phone testing) |
| `HOST`         | Optional bind address (default `0.0.0.0`) |

**Stripe Checkout (backend)** — set in `.env` / hosting dashboard:

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe secret key (test or live) |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for `POST /api/payments/webhook` (`checkout.session.completed`) |
| `FRONTEND_PUBLIC_URL` | SPA origin, no trailing slash; used to build default success/cancel URLs if `PAYMENT_*` are unset |
| `PAYMENT_SUCCESS_URL` | Optional full URL after successful payment (e.g. `https://your-site.vercel.app/booking?payment=success`) |
| `PAYMENT_CANCEL_URL` | Optional full URL if user cancels Checkout |

### Frontend (`frontend/.env`)

Copy from `frontend/.env.example`:

| Variable         | Description |
|------------------|-------------|
| `VITE_API_URL`   | API origin, no trailing slash (e.g. `http://localhost:4000`). In **development**, if this is `localhost` / `127.0.0.1`, the app uses relative `/api` URLs so the Vite proxy works—including from phones on the same Wi‑Fi. |

## Run locally

### 1. Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run db:seed
npm run dev
```

The API listens on **`0.0.0.0`** at the port from `PORT` (default **4000**), so other devices on your network can reach it using your computer’s LAN IP.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite uses **`host: true`**, so you can open the app from a phone at `http://<your-PC-LAN-IP>:5173`.

**Phones on the same Wi‑Fi:** add your dev origin to backend `CORS_ORIGIN`, for example:

`CORS_ORIGIN=http://localhost:5173,http://192.168.1.42:5173`

(Replace `192.168.1.42` with your machine’s address.)

## Production build (frontend)

```bash
cd frontend
npm run build
npm run preview
```

Set `VITE_API_URL` to your **deployed API URL** before building (see Vercel section below). The preview server also binds to all interfaces (`host: true`) for LAN checks.

## Deploy

### Frontend on Vercel

1. Import the Git repository and set the **root directory** to `frontend`.
2. **Build command:** `npm run build`
3. **Output directory:** `dist`
4. **Environment variables** (Project → Settings → Environment Variables):
   - `VITE_API_URL` = your backend public URL, e.g. `https://your-api.onrender.com` (no trailing slash)

`frontend/vercel.json` rewrites all routes to `index.html` for client-side routing.

### Backend on Render

1. Create a **Web Service** from the repo; set **root directory** to `backend`.
2. **Build command:** `npm install && npx prisma generate` (add `&& npx prisma migrate deploy` if you use migrations in production).
3. **Start command:** `npm start`
4. **Environment variables** (Render dashboard):
   - `DATABASE_URL` — use a **managed PostgreSQL** instance on Render (or another host). SQLite file storage is not durable on ephemeral disks.
   - `JWT_SECRET` — strong random string
   - `PORT` — usually injected by Render (keep `process.env.PORT` as implemented)
   - `CORS_ORIGIN` — your Vercel site origin, e.g. `https://your-app.vercel.app`

Point the frontend `VITE_API_URL` at this service URL and redeploy the frontend.

### Render: fix failed migration (P3009)

If deploys fail with **P3009** because `20260509120000_init` was recorded as failed, clear that state **without** resetting the database:

1. Open **Render → your Web Service → Shell** (or run locally with the **same** production `DATABASE_URL`).
2. From the repo **`backend`** root (where `prisma/` lives):

```bash
cd backend
npm install
npx prisma@5.22.0 migrate resolve --rolled-back 20260509120000_init
npx prisma@5.22.0 migrate deploy
```

`--rolled-back` marks the failed migration as rolled back so `migrate deploy` can apply it again.

**Or** use the npm alias (still uses Prisma 5.22 from `devDependencies` after `npm install`):

```bash
cd backend
npm install
npm run prisma:migrate:resolve-init-rolled-back
npm run prisma:migrate:deploy
```

Then trigger a normal deploy (build can keep running `migrate deploy` as usual).

If the first migration **partially** created tables before it failed, `migrate deploy` may error on “already exists”. In that case inspect the database (e.g. list tables in `public`) and fix duplicates manually or adjust—do **not** run `migrate reset` on production.

## Project layout

- `frontend/` — React SPA, `src/api/client.js` uses `import.meta.env.VITE_API_URL`
- `backend/` — Express API under `/api/*`, CORS from `CORS_ORIGIN`
