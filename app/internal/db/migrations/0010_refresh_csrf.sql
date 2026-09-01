-- +goose Up
-- CSRF proof paired 1:1 with a refresh token: issued alongside it, returned
-- to the frontend in the login/register JSON body (never as a second
-- cookie — a cookie set by the API origin isn't readable by frontend JS on
-- a different origin), and echoed back as the X-CSRF-Token header on
-- refresh/logout, where the server compares its hash against this column.
ALTER TABLE refresh_tokens ADD COLUMN csrf_hash text NOT NULL DEFAULT '';

-- +goose Down
ALTER TABLE refresh_tokens DROP COLUMN csrf_hash;
