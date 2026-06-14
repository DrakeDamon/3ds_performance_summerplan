-- 3DS owned lead list. Shaped so rows export cleanly into the 3DS Engine CRM
-- and the Athlete Score flywheel later.
CREATE TABLE IF NOT EXISTS leads (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ts           TEXT NOT NULL,           -- ISO8601 capture time
  name         TEXT,
  email        TEXT,
  phone        TEXT,
  sport        TEXT,                     -- "HS WR", "college 400m", etc.
  interest     TEXT,                     -- 'schedule' | 'courses'
  path         TEXT,
  referrer     TEXT,
  visitor_id   TEXT,
  utm_source   TEXT,
  utm_medium   TEXT,
  utm_campaign TEXT,
  utm_term     TEXT,
  utm_content  TEXT,
  ip           TEXT,
  ua           TEXT,
  stage        TEXT DEFAULT 'new'        -- new → vetted → booked → paid (Engine CRM)
);
CREATE INDEX IF NOT EXISTS idx_leads_ts ON leads(ts);
CREATE INDEX IF NOT EXISTS idx_leads_interest ON leads(interest);
