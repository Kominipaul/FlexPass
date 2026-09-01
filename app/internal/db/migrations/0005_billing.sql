-- +goose Up
CREATE TABLE invoices (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id     uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    number        text NOT NULL UNIQUE,             -- 'ΑΠΥ-2049'
    issued_on     date NOT NULL DEFAULT current_date,
    description_el text NOT NULL,
    description_en text NOT NULL,
    total_cents   integer NOT NULL,
    currency      text NOT NULL DEFAULT 'EUR',
    status        text NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','refunded','pending')),
    payment_method text,
    provider_ref  text,
    mydata_mark   text,
    created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX invoices_member_idx ON invoices(member_id, issued_on DESC);

CREATE SEQUENCE invoice_number_seq START 2050;

-- +goose Down
DROP SEQUENCE IF EXISTS invoice_number_seq;
DROP TABLE IF EXISTS invoices;
