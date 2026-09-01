-- +goose Up
-- Backs generated member codes like 'PLG-1042'. Starts above the range used
-- by any historical demo/seed data so codes never collide with it.
CREATE SEQUENCE member_code_seq START 1042;

-- +goose Down
DROP SEQUENCE IF EXISTS member_code_seq;
