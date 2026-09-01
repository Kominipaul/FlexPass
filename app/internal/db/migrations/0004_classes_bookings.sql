-- +goose Up
CREATE TABLE classes (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id   uuid NOT NULL REFERENCES locations(id),
    discipline_id uuid NOT NULL REFERENCES disciplines(id),
    trainer_id    uuid NOT NULL REFERENCES trainers(id),
    title_el      text,
    title_en      text,
    starts_at     timestamptz NOT NULL,
    duration_min  integer NOT NULL CHECK (duration_min > 0),
    capacity      integer NOT NULL CHECK (capacity > 0),
    level         text NOT NULL DEFAULT 'all' CHECK (level IN ('all','beginner','inter','adv')),
    status        text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','cancelled')),
    created_by    uuid REFERENCES users(id),
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX classes_starts_at_idx ON classes(starts_at);
CREATE INDEX classes_location_starts_idx ON classes(location_id, starts_at);

CREATE TABLE bookings (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id           uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    member_id          uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    status             text NOT NULL CHECK (status IN ('booked','waitlisted','cancelled','attended','no_show')),
    waitlist_position  integer,
    late_cancel        boolean NOT NULL DEFAULT false,
    booked_at          timestamptz NOT NULL DEFAULT now(),
    cancelled_at       timestamptz,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now()
);
-- a member holds at most one live seat (booked or waitlisted) per class
CREATE UNIQUE INDEX bookings_one_live_seat
    ON bookings(class_id, member_id) WHERE status IN ('booked','waitlisted');
CREATE INDEX bookings_member_idx ON bookings(member_id);
CREATE INDEX bookings_class_status_idx ON bookings(class_id, status);

-- +goose Down
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS classes;
