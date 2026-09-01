package httpapi

import (
	"net/http"
	"strings"

	"github.com/kominipaul/flexpass/app/internal/auth"
)

// requireAuth verifies the bearer access token and attaches its claims to
// the request context. 401 with a stable code on anything wrong — expired,
// malformed, or missing — so the frontend can react uniformly (refresh once,
// then send the user to login).
func (s *Server) requireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := r.Header.Get("Authorization")
		const prefix = "Bearer "
		if !strings.HasPrefix(h, prefix) {
			writeProblem(w, http.StatusUnauthorized, "UNAUTHENTICATED", "missing bearer token")
			return
		}
		claims, err := auth.ParseAccessToken(s.cfg.JWTSecret, strings.TrimPrefix(h, prefix))
		if err != nil {
			writeProblem(w, http.StatusUnauthorized, "UNAUTHENTICATED", "invalid or expired token")
			return
		}
		next.ServeHTTP(w, r.WithContext(withClaims(r.Context(), claims)))
	})
}

// requireRole gates a route to one of the given roles, after requireAuth
// has already run. 403, not 401 — the caller is authenticated, just not
// allowed here.
func (s *Server) requireRole(roles ...string) func(http.Handler) http.Handler {
	allowed := make(map[string]bool, len(roles))
	for _, r := range roles {
		allowed[r] = true
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := claimsFrom(r.Context())
			if claims == nil || !allowed[claims.Role] {
				writeProblem(w, http.StatusForbidden, "FORBIDDEN", "not allowed for this role")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// cors allows exactly one configured origin, with credentials — the
// frontend dev server (or the production origin), never a wildcard, since
// cookies are in play.
func (s *Server) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && origin == s.cfg.CORSOrigin {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type,Authorization,X-CSRF-Token,Accept-Language")
			w.Header().Set("Vary", "Origin")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// securityHeaders sets the handful of headers that cost nothing and rule
// out a class of browser-side mistakes.
func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("X-Frame-Options", "DENY")
		next.ServeHTTP(w, r)
	})
}
