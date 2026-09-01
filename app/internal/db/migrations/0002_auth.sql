-- +goose Up
CREATE TABLE users (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email              citext NOT NULL UNIQUE,
    password_hash      text NOT NULL,
    role               text NOT NULL DEFAULT 'member' CHECK (role IN ('member','staff','admin')),
    locale             text NOT NULL DEFAULT 'el' CHECK (locale IN ('el','en')),
    status             text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
    email_verified_at  timestamptz,
    last_login_at      timestamptz,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE refresh_tokens (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash   text NOT NULL UNIQUE,
    expires_at   timestamptz NOT NULL,
    revoked_at   timestamptz,
    replaced_by  uuid REFERENCES refresh_tokens(id),
    user_agent   text,
    ip           inet,
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens(user_id);

CREATE TABLE login_attempts (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email       citext NOT NULL,
    ip          inet NOT NULL,
    succeeded   boolean NOT NULL,
    attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX login_attempts_email_time_idx ON login_attempts(email, attempted_at DESC);
CREATE INDEX login_attempts_ip_time_idx ON login_attempts(ip, attempted_at DESC);

-- +goose Down
DROP TABLE IF EXISTS login_attempts;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS users;
