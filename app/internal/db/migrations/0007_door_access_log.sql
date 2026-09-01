-- +goose Up
CREATE TABLE door_devices (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id    uuid NOT NULL REFERENCES locations(id),
    label          text NOT NULL,
    api_key_hash   text NOT NULL UNIQUE,
    last_seen_at   timestamptz,
    created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE check_ins (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id      uuid REFERENCES members(id),
    location_id    uuid NOT NULL REFERENCES locations(id),
    scanned_at     timestamptz NOT NULL DEFAULT now(),
    result         text NOT NULL CHECK (result IN ('granted','denied')),
    reason_code    text NOT NULL,
    device_id      uuid REFERENCES door_devices(id),
    staff_user_id  uuid REFERENCES users(id)
);
CREATE INDEX check_ins_member_idx ON check_ins(member_id, scanned_at DESC);
CREATE INDEX check_ins_location_time_idx ON check_ins(location_id, scanned_at DESC);

-- Replay protection: the same member cannot be granted twice inside the same
-- HMAC rotation window (60s) — enforced by the app checking this table, this
-- index just makes that check cheap.
CREATE INDEX check_ins_replay_idx ON check_ins(member_id, scanned_at) WHERE result = 'granted';

-- +goose Down
DROP TABLE IF EXISTS check_ins;
DROP TABLE IF EXISTS door_devices;
