// Package config loads runtime configuration from the environment. Kept
// dependency-free on purpose: this is the only place in the app that reads
// os.Getenv, so every other package receives config as plain fields.
package config

import (
	"fmt"
	"os"
	"time"
)

type Config struct {
	// DatabaseURL is a libpq connection string, e.g.
	// "postgres://user:pass@host:5432/dbname?sslmode=disable".
	DatabaseURL string

	// HTTPAddr is the address the API listens on, e.g. ":8080".
	HTTPAddr string

	// JWTSecret signs access tokens. Must be at least 32 bytes in production.
	JWTSecret []byte

	// AccessTokenTTL / RefreshTokenTTL control session lifetime.
	AccessTokenTTL  time.Duration
	RefreshTokenTTL time.Duration

	// CORSOrigin is the single allowed frontend origin (dev: the Vite server).
	CORSOrigin string

	// Env is "development" or "production" — gates cookie Secure flag, etc.
	Env string
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		panic(fmt.Sprintf("config: required env var %s is not set", key))
	}
	return v
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envDurationOr(key string, fallback time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		d, err := time.ParseDuration(v)
		if err != nil {
			panic(fmt.Sprintf("config: invalid duration for %s: %v", key, err))
		}
		return d
	}
	return fallback
}

// Load reads configuration from the environment. It panics on a missing
// required variable — config errors should surface at boot, not mid-request.
func Load() Config {
	env := envOr("APP_ENV", "development")

	secret := mustEnv("JWT_SECRET")
	if len(secret) < 32 {
		panic("config: JWT_SECRET must be at least 32 characters")
	}

	return Config{
		DatabaseURL:     mustEnv("DATABASE_URL"),
		HTTPAddr:        envOr("HTTP_ADDR", ":8080"),
		JWTSecret:       []byte(secret),
		AccessTokenTTL:  envDurationOr("ACCESS_TOKEN_TTL", 15*time.Minute),
		RefreshTokenTTL: envDurationOr("REFRESH_TOKEN_TTL", 30*24*time.Hour),
		CORSOrigin:      envOr("CORS_ORIGIN", "http://localhost:5173"),
		Env:             env,
	}
}

func (c Config) IsProd() bool { return c.Env == "production" }
