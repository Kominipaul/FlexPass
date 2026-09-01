-- +goose Up
CREATE TABLE members (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    member_code      text NOT NULL UNIQUE,          -- 'PLG-1042'
    first_name       text NOT NULL,
    last_name        text NOT NULL,
    phone            text,
    birth_date       date,
    home_location_id uuid NOT NULL REFERENCES locations(id),
    joined_on        date NOT NULL DEFAULT current_date,
    door_secret      bytea NOT NULL,                 -- 32 random bytes, HMAC key for the rotating pass
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE memberships (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id    uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    plan_id      uuid NOT NULL REFERENCES plans(id),
    starts_on    date NOT NULL,
    ends_on      date NOT NULL,
    status       text NOT NULL DEFAULT 'active' CHECK (status IN ('active','frozen','expired','cancelled')),
    auto_renew   boolean NOT NULL DEFAULT true,
    price_cents  integer NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);
-- one live (non-cancelled) membership per member
CREATE UNIQUE INDEX memberships_one_live_per_member
    ON memberships(member_id) WHERE status <> 'cancelled';

CREATE TABLE membership_freezes (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id  uuid NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
    starts_on      date NOT NULL,
    ends_on        date NOT NULL,
    days_held      integer NOT NULL,
    fee_cents      integer NOT NULL DEFAULT 0,
    created_by     uuid REFERENCES users(id),
    created_at     timestamptz NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS membership_freezes;
DROP TABLE IF EXISTS memberships;
DROP TABLE IF EXISTS members;
