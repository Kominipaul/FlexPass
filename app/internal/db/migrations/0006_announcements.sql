-- +goose Up
CREATE TABLE announcements (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    kind           text NOT NULL CHECK (kind IN ('offer','news')),
    title_el       text NOT NULL,
    title_en       text NOT NULL,
    body_el        text NOT NULL,
    body_en        text NOT NULL,
    cta_label_el   text,
    cta_label_en   text,
    cta_action     text,                             -- e.g. 'request_pt'
    starts_on      date NOT NULL DEFAULT current_date,
    ends_on        date,
    target_plan_ids uuid[],
    active         boolean NOT NULL DEFAULT true,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS announcements;
