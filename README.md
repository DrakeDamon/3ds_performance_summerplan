# 3DS Performance — Enrollment Site

Dark, athletic storefront for 3DS Performance training packages.
React (Vite) frontend + FastAPI backend. Checkout runs on Stripe
Payment Links; the backend resolves links and captures click/pageview
metadata into SQLite.

## Structure

```
backend/    FastAPI — /api/packages, /api/checkout, /api/track, /api/stats
frontend/   React + Vite — storefront UI
```

## Run locally

Backend (terminal 1):

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # edit values
uvicorn main:app --reload --port 8000
```

Frontend (terminal 2):

```bash
cd frontend
npm install
npm run dev                  # http://localhost:5173 (proxies /api -> :8000)
```

## Deploy

**Frontend — GitHub Pages (live):** every push to `main` triggers
`.github/workflows/deploy.yml`, which builds `frontend/` and publishes it to
<https://3dsperformance.com> (GitHub Pages custom domain; the old github.io URL redirects). On Pages the app
runs in **static mode**: no backend calls; Enroll buttons go straight to the
public Stripe Payment Links, so booking works with zero servers. Analytics
(`/api/track`, `/api/stats`) are inactive in this mode.

**Backend (optional, for analytics) — any Python host (e.g. Hetzner VPS):**

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

Put it behind nginx/caddy with TLS. Set `ALLOWED_ORIGINS` in `.env` to
`https://drakedamon.github.io` (scheme + host only — no path). Then set a
repo variable `VITE_API_BASE=https://api.yourdomain.com`, uncomment the
`env:` block in the workflow, and redeploy — the frontend switches out of
static mode and resumes logging pageviews/clicks/UTM.

## Metadata captured

- `pageview` — path, referrer, screen size, timezone, user-agent, IP
- `checkout_click` — package, plan, plus the above
- Owner summary: `GET /api/stats` with header
  `Authorization: Bearer <ADMIN_TOKEN>`

## Security notes

- No secret keys are required at runtime: Stripe Payment Links are
  public checkout URLs. The optional `STRIPE_SECRET_KEY` slot in
  `.env.example` exists only for future server-side Stripe work —
  use a **restricted** key if you ever fill it in.
- `.env` is gitignored. Never commit it. Never paste keys into chats,
  issues, or commits — if a key leaks, roll it in the Stripe dashboard.
- `/api/stats` requires the `ADMIN_TOKEN` you set in `.env`.

## Updating prices or packages

Prices/links live in `backend/main.py` (`PACKAGES`) and mirror in
`frontend/src/App.jsx` (`FALLBACK`). Change a price in Stripe →
create the new Payment Link → update both places.
