-- +goose Up
CREATE TABLE locations (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code        text NOT NULL UNIQUE,              -- 'ART', 'PIL'
    name_el     text NOT NULL,
    name_en     text NOT NULL,
    address_el  text NOT NULL,
    address_en  text NOT NULL,
    opens_at    time NOT NULL,
    closes_at   time NOT NULL,
    timezone    text NOT NULL DEFAULT 'Europe/Athens',
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE plans (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code        text NOT NULL UNIQUE,              -- 'basic', 'group', 'premium'
    name_el     text NOT NULL,
    name_en     text NOT NULL,
    price_cents integer NOT NULL CHECK (price_cents >= 0),
    currency    text NOT NULL DEFAULT 'EUR',
    active      boolean NOT NULL DEFAULT true,
    sort_order  integer NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE disciplines (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code        text NOT NULL UNIQUE,              -- 'pilates', 'functional', ...
    name_el     text NOT NULL,
    name_en     text NOT NULL,
    icon        text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE plan_location_access (
    plan_id     uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    PRIMARY KEY (plan_id, location_id)
);

CREATE TABLE plan_discipline_access (
    plan_id       uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    discipline_id uuid NOT NULL REFERENCES disciplines(id) ON DELETE CASCADE,
    PRIMARY KEY (plan_id, discipline_id)
);

CREATE TABLE trainers (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name_el     text NOT NULL,
    name_en     text NOT NULL,
    active      boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS trainers;
DROP TABLE IF EXISTS plan_discipline_access;
DROP TABLE IF EXISTS plan_location_access;
DROP TABLE IF EXISTS disciplines;
DROP TABLE IF EXISTS plans;
DROP TABLE IF EXISTS locations;
