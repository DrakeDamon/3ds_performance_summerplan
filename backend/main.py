"""
3DS Performance — API backend.

Serves package data, routes checkout clicks to Stripe Payment Links,
and captures click/pageview metadata into SQLite.

No secrets live in this file. Configuration comes from environment
variables (see .env.example). Stripe Payment Links are public checkout
URLs by design — the secret key is never needed at runtime here.
"""

import os
import secrets
import sqlite3
import time
from collections import defaultdict, deque
from contextlib import closing

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

load_dotenv()

DB_PATH = os.getenv("ANALYTICS_DB", "analytics.db")
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "")
ALLOWED_ORIGINS = [
    o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
]
# Requests per IP per window for the write endpoints (checkout / track).
RATE_LIMIT = int(os.getenv("RATE_LIMIT", "60"))
RATE_WINDOW = int(os.getenv("RATE_WINDOW_SECONDS", "60"))

app = FastAPI(title="3DS Performance API", docs_url=None, redoc_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    # Only the headers the frontend actually sends — not a wildcard.
    allow_headers=["Content-Type", "Authorization"],
)


# ---------------------------------------------------------- security layer


@app.middleware("http")
async def security_headers(request: Request, call_next):
    """Defense-in-depth headers on every response. CSP is intentionally
    strict but allows Google Fonts and Stripe checkout redirects."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data:; "
        "connect-src 'self'; "
        "form-action https://buy.stripe.com; "
        "frame-ancestors 'none'; "
        "base-uri 'self'"
    )
    return response


# Sliding-window rate limiter. In-memory is fine for a single uvicorn
# worker at this scale; swap for Redis if you ever run multiple workers.
_hits: dict[str, deque] = defaultdict(deque)


def rate_limited(ip: str | None) -> bool:
    if not ip:
        return False
    now = time.time()
    window = _hits[ip]
    cutoff = now - RATE_WINDOW
    while window and window[0] < cutoff:
        window.popleft()
    if len(window) >= RATE_LIMIT:
        return True
    window.append(now)
    return False

# ---------------------------------------------------------------- database


def db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts REAL NOT NULL,
            kind TEXT NOT NULL,            -- pageview | checkout_click | toggle | tab
            package_id TEXT,
            plan TEXT,                     -- monthly | full | single
            path TEXT,
            referrer TEXT,
            user_agent TEXT,
            screen TEXT,
            tz TEXT,
            ip TEXT,
            visitor_id TEXT,               -- anonymous client id (funnel dedup)
            utm_source TEXT,
            utm_medium TEXT,
            utm_campaign TEXT,
            utm_term TEXT,
            utm_content TEXT
        )"""
    )
    # Idempotent migration: add UTM/visitor columns to pre-existing DBs.
    cols = {row[1] for row in conn.execute("PRAGMA table_info(events)")}
    for col in (
        "visitor_id", "utm_source", "utm_medium",
        "utm_campaign", "utm_term", "utm_content",
    ):
        if col not in cols:
            conn.execute(f"ALTER TABLE events ADD COLUMN {col} TEXT")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_events_kind_ts ON events (kind, ts)")
    conn.commit()
    return conn


# ------------------------------------------------------------ package data
# Prices are TRAINING ONLY. Athletes sign up for the gym's morning fitness
# membership ($40/mo) directly with the gym — it is not collected here.

PACKAGES = {
    "summer": {
        "label": "Summer Speed & Power",
        "sub": "8-week block · June–July",
        "plans": ["monthly", "full"],
        "plan_labels": {"monthly": "Monthly", "full": "Pay in full"},
        "items": [
            {
                "id": "summer-speed-strength",
                "name": "Speed + Strength",
                "schedule": "2 gym + 1 speed / wk",
                "monthly": 29900,
                "full": 59800,
                "features": [
                    "2 gym strength & power sessions weekly",
                    "1 speed session weekly",
                    "Force production & sprint mechanics",
                    "Specialty Lab access optional",
                ],
                "links": {
                    "monthly": "https://buy.stripe.com/8x27sD7lZ0m47lu0FI1B60p",
                    "full": "https://buy.stripe.com/9B63cn35JfgY35e2NQ1B60o",
                },
            },
            {
                "id": "summer-development",
                "name": "Development",
                "schedule": "3 gym + 2 speed / wk",
                "monthly": 39900,
                "full": 79800,
                "features": [
                    "3 gym sessions weekly",
                    "2 speed sessions weekly",
                    "1 Specialty Lab credit monthly",
                    "Acceleration & max-velocity work",
                ],
                "links": {
                    "monthly": "https://buy.stripe.com/cNieV57lZ5GobBK0FI1B60r",
                    "full": "https://buy.stripe.com/dRm7sD6hVc4MgW49ce1B60q",
                },
            },
            {
                "id": "summer-performance",
                "name": "Performance",
                "schedule": "4 gym + 2 speed / wk",
                "featured": True,
                "monthly": 49900,
                "full": 99800,
                "features": [
                    "4 gym sessions weekly",
                    "2 speed sessions weekly",
                    "2 Specialty Lab credits monthly",
                    "Best balance of strength + speed transfer",
                ],
                "links": {
                    "monthly": "https://buy.stripe.com/00w7sD8q3fgYeNW1JM1B60t",
                    "full": "https://buy.stripe.com/00w4grcGj3ygbBK9ce1B60s",
                },
            },
            {
                "id": "summer-elite-power",
                "name": "Elite Power",
                "schedule": "5 gym + 2 speed / wk",
                "monthly": 62900,
                "full": 125800,
                "features": [
                    "5 gym sessions weekly",
                    "2 speed sessions weekly",
                    "2 Specialty Lab credits monthly",
                    "For serious varsity, college & pro athletes",
                ],
                "links": {
                    "monthly": "https://buy.stripe.com/14A4gr5dR5Go7lu7461B60v",
                    "full": "https://buy.stripe.com/4gMfZ97lZc4MaxG3RU1B60u",
                },
            },
        ],
    },
    "ongoing": {
        "label": "Year-Round Training",
        "sub": "After summer · 12-week blocks or month-to-month",
        "plans": ["monthly", "full"],
        "plan_labels": {"monthly": "Monthly", "full": "12-week block"},
        "items": [
            {
                "id": "ongoing-maintenance",
                "name": "Maintenance",
                "schedule": "3 gym + 1 speed / wk",
                "monthly": 33000,
                "full": 99000,
                "features": [
                    "3 gym sessions weekly",
                    "1 speed session weekly",
                    "Keeps strength & speed in-season",
                    "Flexible around practice schedules",
                ],
                "links": {
                    "monthly": "https://buy.stripe.com/5kQdR15dR1q8fS09ce1B60A",
                    "full": "https://buy.stripe.com/7sYaEP49N4Ck6hqfAC1B60B",
                },
            },
            {
                "id": "ongoing-performance",
                "name": "Performance",
                "schedule": "3 gym + 2 speed / wk",
                "featured": True,
                "monthly": 37500,
                "full": 112500,
                "features": [
                    "3 gym sessions weekly",
                    "2 speed sessions weekly",
                    "Off-season development focus",
                    "Testing & progress tracking",
                ],
                "links": {
                    "monthly": "https://buy.stripe.com/cNi6oz35Jd8QcFO6021B60C",
                    "full": "https://buy.stripe.com/bJeaEP0XBecUeNW7461B60D",
                },
            },
            {
                "id": "ongoing-college-pro",
                "name": "College/Pro Hybrid",
                "schedule": "4 gym + 2 speed / wk",
                "monthly": 40000,
                "full": 120000,
                "features": [
                    "4 gym sessions weekly",
                    "2 speed sessions weekly",
                    "Built for college & pro athletes",
                    "Highest weekly training exposure",
                ],
                "links": {
                    "monthly": "https://buy.stripe.com/9B6aEP0XBb0IgW47461B60E",
                    "full": "https://buy.stripe.com/bJeaEP5dR6KscFO0FI1B60F",
                },
            },
        ],
    },
    "dropin": {
        "label": "Drop-Ins",
        "sub": "Space-available · max 2 per month before enrolling",
        "plans": ["single"],
        "plan_labels": {"single": "Per session"},
        "items": [
            {
                "id": "dropin-speed",
                "name": "Speed Session",
                "schedule": "Single session",
                "single": 2000,
                "features": ["Acceleration, max velocity, COD", "No gym membership needed"],
                "links": {"single": "https://buy.stripe.com/4gM00b49N7OwbBK88a1B60w"},
            },
            {
                "id": "dropin-gym",
                "name": "Gym Session",
                "schedule": "Single session",
                "single": 4000,
                "features": ["Strength & power training", "Gym day pass paid to gym"],
                "links": {"single": "https://buy.stripe.com/7sY6ozgWz5Go6hq7461B60x"},
            },
            {
                "id": "dropin-lab",
                "name": "Specialty Lab",
                "schedule": "Single session",
                "single": 4000,
                "features": ["Sport-speed transfer work", "Space available only"],
                "links": {"single": "https://buy.stripe.com/3cI5kv5dR4Ck6hq3RU1B60y"},
            },
            {
                "id": "dropin-member-lab",
                "name": "Member Extra Lab",
                "schedule": "Single session",
                "single": 3500,
                "features": ["Enrolled athletes only", "Beyond monthly lab credits"],
                "links": {"single": "https://buy.stripe.com/8x2dR1bCf8SAcFObkm1B60z"},
            },
        ],
    },
}


# ---------------------------------------------------------------- schemas


# Length caps below keep a hostile client from stuffing the events table
# (each field is bounded; user-agent is truncated server-side).

class EventMeta(BaseModel):
    path: str | None = Field(default=None, max_length=512)
    referrer: str | None = Field(default=None, max_length=512)
    screen: str | None = Field(default=None, max_length=32)
    tz: str | None = Field(default=None, max_length=64)
    visitor_id: str | None = Field(default=None, max_length=64)
    utm_source: str | None = Field(default=None, max_length=128)
    utm_medium: str | None = Field(default=None, max_length=128)
    utm_campaign: str | None = Field(default=None, max_length=128)
    utm_term: str | None = Field(default=None, max_length=128)
    utm_content: str | None = Field(default=None, max_length=128)


class TrackEvent(EventMeta):
    kind: str = Field(max_length=32)


class CheckoutRequest(EventMeta):
    package_id: str = Field(max_length=64)
    plan: str = Field(max_length=32)


# ----------------------------------------------------------------- routes


@app.get("/api/packages")
def get_packages():
    """Package catalog: groups, items, prices (cents), checkout availability."""
    public = {}
    for group_key, group in PACKAGES.items():
        public[group_key] = {
            "label": group["label"],
            "sub": group["sub"],
            "plans": group["plans"],
            "plan_labels": group["plan_labels"],
            "items": [
                {k: v for k, v in item.items() if k != "links"}
                for item in group["items"]
            ],
        }
    return public


def _log_event(conn, *, kind, request, body, package_id=None, plan=None):
    """Single source of truth for the events INSERT (all columns)."""
    conn.execute(
        "INSERT INTO events (ts, kind, package_id, plan, path, referrer,"
        " user_agent, screen, tz, ip, visitor_id, utm_source, utm_medium,"
        " utm_campaign, utm_term, utm_content)"
        " VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        (
            time.time(),
            kind,
            package_id,
            plan,
            body.path,
            body.referrer,
            request.headers.get("user-agent", "")[:300],
            body.screen,
            body.tz,
            request.client.host if request.client else None,
            body.visitor_id,
            body.utm_source,
            body.utm_medium,
            body.utm_campaign,
            body.utm_term,
            body.utm_content,
        ),
    )


@app.post("/api/checkout")
def checkout(body: CheckoutRequest, request: Request):
    """Resolve a package+plan to its Stripe Payment Link, logging the click."""
    if rate_limited(request.client.host if request.client else None):
        raise HTTPException(status_code=429, detail="Too many requests")

    item = None
    for group in PACKAGES.values():
        for candidate in group["items"]:
            if candidate["id"] == body.package_id:
                item = candidate
                break
    if not item or body.plan not in item.get("links", {}):
        raise HTTPException(status_code=404, detail="Unknown package or plan")

    with closing(db()) as conn:
        _log_event(
            conn,
            kind="checkout_click",
            request=request,
            body=body,
            package_id=body.package_id,
            plan=body.plan,
        )
        conn.commit()

    return {"url": item["links"][body.plan]}


@app.post("/api/track")
def track(body: TrackEvent, request: Request):
    """Capture a pageview or interaction event."""
    if body.kind not in {"pageview", "toggle", "tab"}:
        raise HTTPException(status_code=400, detail="Unknown event kind")
    if rate_limited(request.client.host if request.client else None):
        raise HTTPException(status_code=429, detail="Too many requests")
    with closing(db()) as conn:
        _log_event(conn, kind=body.kind, request=request, body=body)
        conn.commit()
    return {"ok": True}


@app.get("/api/stats")
def stats(authorization: str = Header(default="")):
    """Owner-only summary. Pass: Authorization: Bearer <ADMIN_TOKEN>."""
    # Constant-time compare so the token can't be guessed byte-by-byte
    # via response-timing differences.
    expected = f"Bearer {ADMIN_TOKEN}"
    if not ADMIN_TOKEN or not secrets.compare_digest(authorization, expected):
        raise HTTPException(status_code=401, detail="Unauthorized")
    with closing(db()) as conn:
        pageviews = conn.execute(
            "SELECT COUNT(*) FROM events WHERE kind='pageview'"
        ).fetchone()[0]
        unique_visitors = conn.execute(
            "SELECT COUNT(DISTINCT visitor_id) FROM events WHERE visitor_id IS NOT NULL"
        ).fetchone()[0]
        total_clicks = conn.execute(
            "SELECT COUNT(*) FROM events WHERE kind='checkout_click'"
        ).fetchone()[0]
        clicks = conn.execute(
            "SELECT package_id, plan, COUNT(*) FROM events"
            " WHERE kind='checkout_click' GROUP BY package_id, plan"
            " ORDER BY COUNT(*) DESC"
        ).fetchall()
        sources = conn.execute(
            "SELECT utm_source, COUNT(*) FROM events"
            " WHERE kind='pageview' GROUP BY utm_source ORDER BY COUNT(*) DESC"
        ).fetchall()
        campaigns = conn.execute(
            "SELECT utm_campaign, COUNT(*) FROM events"
            " WHERE kind='checkout_click' GROUP BY utm_campaign ORDER BY COUNT(*) DESC"
        ).fetchall()
    return {
        "pageviews": pageviews,
        "unique_visitors": unique_visitors,
        "total_clicks": total_clicks,
        "conversion_rate": round(total_clicks / pageviews, 4) if pageviews else 0.0,
        "checkout_clicks": [
            {"package_id": p, "plan": pl, "count": c} for p, pl, c in clicks
        ],
        "traffic_sources": [
            {"source": s or "direct", "pageviews": c} for s, c in sources
        ],
        "campaigns": [
            {"campaign": c or "(none)", "clicks": n} for c, n in campaigns
        ],
    }


@app.get("/api/health")
def health():
    return {"ok": True}
