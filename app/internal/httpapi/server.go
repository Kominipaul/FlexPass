// Package httpapi wires the HTTP surface: routing, middleware, and request
// handlers. Handlers stay thin — validate input, call a store/service
// method, translate the result to JSON. Business rules that need their own
// tests (access evaluation, booking capacity) live in their own packages.
package httpapi

import (
	"log/slog"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kominipaul/flexpass/app/internal/config"
)

type Server struct {
	pool *pgxpool.Pool
	cfg  config.Config
	log  *slog.Logger
}

func New(pool *pgxpool.Pool, cfg config.Config, log *slog.Logger) *Server {
	return &Server{pool: pool, cfg: cfg, log: log}
}

const refreshCookieName = "plg_refresh"

// cookieBase returns the attributes shared by every cookie this API sets.
// Secure is forced on outside development — a refresh token cookie must
// never travel over plain HTTP in production.
func (s *Server) cookieBase() http.Cookie {
	return http.Cookie{
		Path:     "/api/v1/auth",
		HttpOnly: true,
		Secure:   s.cfg.IsProd(),
		SameSite: http.SameSiteLaxMode,
	}
}
