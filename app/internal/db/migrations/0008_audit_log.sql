-- +goose Up
CREATE TABLE audit_log (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id  uuid REFERENCES users(id),
    action         text NOT NULL,
    entity         text NOT NULL,
    entity_id      uuid,
    before_data    jsonb,
    after_data     jsonb,
    at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_entity_idx ON audit_log(entity, entity_id, at DESC);

-- +goose Down
DROP TABLE IF EXISTS audit_log;
