-- +goose Up
-- Replay protection must key on the exact HMAC rotation window a grant was
-- issued for, not on wall-clock recency: "any grant in the last 60s" would
-- also block a second, entirely legitimate visit made on a fresh token
-- moments later. Storing the matched window lets the check be precise: the
-- same window producing two grants is a replayed QR; a new window is
-- always a new, real scan.
ALTER TABLE check_ins ADD COLUMN matched_window bigint;

DROP INDEX IF EXISTS check_ins_replay_idx;
CREATE UNIQUE INDEX check_ins_replay_idx
    ON check_ins(member_id, matched_window) WHERE result = 'granted';

-- +goose Down
DROP INDEX IF EXISTS check_ins_replay_idx;
ALTER TABLE check_ins DROP COLUMN matched_window;
