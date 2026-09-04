-- FlexPass schema. Postgres 14+.
--
-- Ids stay TEXT rather than uuid: the app already mints prefixed, readable
-- ids ('u_1042', 'mem_demo') that show up in the member-facing UI and the
-- door log, and keeping them means the domain types cross the wire unchanged.

CREATE TABLE IF NOT EXISTS users (
  id                  TEXT PRIMARY KEY,
  name                TEXT        NOT NULL,
  email               TEXT        NOT NULL UNIQUE,
  phone               TEXT        NOT NULL DEFAULT '',
  dob                 TEXT        NOT NULL DEFAULT '',
  address             TEXT        NOT NULL DEFAULT '',
  member_since        TIMESTAMPTZ NOT NULL DEFAULT now(),
  avatar_color        TEXT        NOT NULL DEFAULT 'volt',
  password_hash       TEXT        NOT NULL,
  emergency_contact   JSONB       NOT NULL DEFAULT '{"name":"","phone":"","relationship":""}'::jsonb,
  two_factor_enabled  BOOLEAN     NOT NULL DEFAULT false,
  check_in_pin        TEXT        NOT NULL,
  -- Never leaves this table. The member's app asks the server to sign a
  -- token; it is not handed the key to sign one itself.
  check_in_secret     TEXT        NOT NULL,
  last_password_change TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email));

CREATE TABLE IF NOT EXISTS locations (
  id           TEXT PRIMARY KEY,
  name         TEXT   NOT NULL UNIQUE,
  address      TEXT   NOT NULL,
  hours        TEXT   NOT NULL,
  closed_days  INT[]  NOT NULL DEFAULT '{}',
  closed_dates TEXT[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS plans (
  id            TEXT PRIMARY KEY,
  tier          TEXT    NOT NULL,
  name          TEXT    NOT NULL,
  tagline       TEXT    NOT NULL,
  price_monthly NUMERIC(10,2) NOT NULL,
  price_yearly  NUMERIC(10,2) NOT NULL,
  color         TEXT    NOT NULL,
  popular       BOOLEAN NOT NULL DEFAULT false,
  -- number of credits, or NULL meaning 'unlimited'
  class_credits INT,
  guest_passes  INT     NOT NULL DEFAULT 0,
  all_locations BOOLEAN NOT NULL DEFAULT false,
  perks         TEXT[]  NOT NULL DEFAULT '{}',
  sort_order    INT     NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS memberships (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id        TEXT NOT NULL REFERENCES plans(id),
  status         TEXT NOT NULL CHECK (status IN ('active','frozen','cancelled','pending_cancellation')),
  billing_cycle  TEXT NOT NULL CHECK (billing_cycle IN ('monthly','yearly')),
  auto_renew     BOOLEAN NOT NULL DEFAULT true,
  start_date     TIMESTAMPTZ NOT NULL,
  renewal_date   TIMESTAMPTZ NOT NULL,
  home_location  TEXT NOT NULL,
  freeze_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- One membership per member: the app assumes it everywhere.
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS activities (
  id          TEXT PRIMARY KEY,
  kind        TEXT NOT NULL CHECK (kind IN ('class','group')),
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  instructor  TEXT NOT NULL,
  location    TEXT NOT NULL,
  location_id TEXT NOT NULL REFERENCES locations(id),
  level       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  capacity    INT  NOT NULL,
  color       TEXT NOT NULL,
  schedule    JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS class_bookings (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  date        TIMESTAMPTZ NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('booked','waitlisted','cancelled','attended','no-show')),
  booked_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS class_bookings_user_idx ON class_bookings (user_id);
-- The seat count the booking path reads must not race two concurrent books.
CREATE INDEX IF NOT EXISTS class_bookings_activity_date_idx ON class_bookings (activity_id, date);

CREATE TABLE IF NOT EXISTS group_memberships (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  status      TEXT NOT NULL CHECK (status IN ('active','left'))
);
CREATE INDEX IF NOT EXISTS group_memberships_user_idx ON group_memberships (user_id);

CREATE TABLE IF NOT EXISTS check_ins (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT now(),
  location      TEXT NOT NULL,
  method        TEXT NOT NULL CHECK (method IN ('QR','PIN')),
  duration_mins INT
);
CREATE INDEX IF NOT EXISTS check_ins_user_time_idx ON check_ins (user_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS invoices (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date        TIMESTAMPTZ NOT NULL DEFAULT now(),
  description TEXT NOT NULL,
  amount      NUMERIC(10,2) NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('paid','due','failed','refunded')),
  method      TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS invoices_user_idx ON invoices (user_id, date DESC);

CREATE TABLE IF NOT EXISTS payment_methods (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand        TEXT NOT NULL CHECK (brand IN ('Visa','Mastercard','Amex')),
  last4        TEXT NOT NULL,
  exp_month    INT  NOT NULL,
  exp_year     INT  NOT NULL,
  is_default   BOOLEAN NOT NULL DEFAULT false,
  name_on_card TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS payment_methods_user_idx ON payment_methods (user_id);

CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read       BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS staff (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('frontdesk','manager')),
  avatar_color  TEXT NOT NULL DEFAULT 'volt'
);

CREATE TABLE IF NOT EXISTS door_scans (
  id          TEXT PRIMARY KEY,
  -- Nullable: a scan of a code claiming a member who does not exist is still
  -- a real event the door log should keep.
  user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  location_id TEXT NOT NULL,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT now(),
  result      TEXT NOT NULL CHECK (result IN ('granted','denied')),
  reason_code TEXT NOT NULL,
  method      TEXT NOT NULL CHECK (method IN ('QR','PIN'))
);
CREATE INDEX IF NOT EXISTS door_scans_time_idx ON door_scans (timestamp DESC);

CREATE TABLE IF NOT EXISTS pin_unlocks (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_id   TEXT NOT NULL,
  staff_id      TEXT NOT NULL REFERENCES staff(id),
  opened_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL,
  attempts_left INT NOT NULL,
  override      BOOLEAN NOT NULL DEFAULT false,
  status        TEXT NOT NULL CHECK (status IN ('open','used','locked','expired','cancelled'))
);
CREATE INDEX IF NOT EXISTS pin_unlocks_open_idx ON pin_unlocks (location_id, status);

CREATE TABLE IF NOT EXISTS training_goals (
  user_id       TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  days_per_week INT   NOT NULL,
  rest_days     INT[] NOT NULL DEFAULT '{}',
  enabled       BOOLEAN NOT NULL DEFAULT true,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Opaque session tokens. Only the SHA-256 of the token is stored, so a dump
-- of this table does not let anyone resume a session.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('member','staff')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_subject_idx ON sessions (subject_id);

CREATE TABLE IF NOT EXISTS password_resets (
  email      TEXT PRIMARY KEY,
  code       TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
