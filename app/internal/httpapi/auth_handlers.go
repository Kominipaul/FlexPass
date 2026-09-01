package httpapi

import (
	"crypto/rand"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/kominipaul/flexpass/app/internal/auth"
	"github.com/kominipaul/flexpass/app/internal/store"
)

type registerRequest struct {
	Email            string  `json:"email"`
	Password         string  `json:"password"`
	FirstName        string  `json:"first_name"`
	LastName         string  `json:"last_name"`
	Phone            *string `json:"phone,omitempty"`
	HomeLocationCode string  `json:"home_location_code"`
	PlanCode         string  `json:"plan_code"`
	Locale           string  `json:"locale,omitempty"`
}

type sessionResponse struct {
	AccessToken string `json:"access_token"`
	CSRFToken   string `json:"csrf_token"`
	ExpiresIn   int    `json:"expires_in"`
	Me          meDTO  `json:"me"`
}

func (s *Server) handleRegister(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := decodeJSON(r, &req); err != nil {
		writeProblem(w, http.StatusBadRequest, "BAD_REQUEST", "malformed JSON body")
		return
	}
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.FirstName = strings.TrimSpace(req.FirstName)
	req.LastName = strings.TrimSpace(req.LastName)

	if err := validateEmail(req.Email); err != nil {
		writeProblem(w, http.StatusBadRequest, "INVALID_EMAIL", err.Error())
		return
	}
	if err := validatePassword(req.Password); err != nil {
		writeProblem(w, http.StatusBadRequest, "WEAK_PASSWORD", err.Error())
		return
	}
	if req.FirstName == "" || req.LastName == "" {
		writeProblem(w, http.StatusBadRequest, "MISSING_NAME", "first_name and last_name are required")
		return
	}
	if req.HomeLocationCode == "" {
		writeProblem(w, http.StatusBadRequest, "MISSING_LOCATION", "home_location_code is required")
		return
	}
	if req.PlanCode == "" {
		writeProblem(w, http.StatusBadRequest, "MISSING_PLAN", "plan_code is required")
		return
	}
	locale := req.Locale
	if locale != "el" && locale != "en" {
		locale = "el"
	}

	passwordHash, err := auth.HashPassword(req.Password)
	if err != nil {
		s.log.Error("hash password", "err", err)
		writeProblem(w, http.StatusInternalServerError, "INTERNAL", "")
		return
	}
	doorSecret := make([]byte, 32)
	if _, err := rand.Read(doorSecret); err != nil {
		s.log.Error("generate door secret", "err", err)
		writeProblem(w, http.StatusInternalServerError, "INTERNAL", "")
		return
	}

	ctx := r.Context()
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		writeProblem(w, http.StatusInternalServerError, "INTERNAL", "")
		return
	}
	defer tx.Rollback(ctx)
	st := store.New(s.pool)

	user, err := st.CreateUser(ctx, tx, req.Email, passwordHash, "member", locale)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			writeProblem(w, http.StatusConflict, "EMAIL_TAKEN", "an account with this email already exists")
			return
		}
		s.log.Error("create user", "err", err)
		writeProblem(w, http.StatusInternalServerError, "INTERNAL", "")
		return
	}

	member, err := st.CreateMember(ctx, tx, user.ID, req.FirstName, req.LastName, req.Phone, req.HomeLocationCode, doorSecret)
	if errors.Is(err, store.ErrNotFound) {
		writeProblem(w, http.StatusBadRequest, "UNKNOWN_LOCATION", "home_location_code does not match a known location")
		return
	}
	if err != nil {
		s.log.Error("create member", "err", err)
		writeProblem(w, http.StatusInternalServerError, "INTERNAL", "")
		return
	}

	if _, err := st.CreateMembership(ctx, tx, member.ID, req.PlanCode, 30); errors.Is(err, store.ErrNotFound) {
		writeProblem(w, http.StatusBadRequest, "UNKNOWN_PLAN", "plan_code does not match a known plan")
		return
	} else if err != nil {
		s.log.Error("create membership", "err", err)
		writeProblem(w, http.StatusInternalServerError, "INTERNAL", "")
		return
	}

	if err := tx.Commit(ctx); err != nil {
		s.log.Error("commit register tx", "err", err)
		writeProblem(w, http.StatusInternalServerError, "INTERNAL", "")
		return
	}

	s.respondWithNewSession(w, r, user)
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := decodeJSON(r, &req); err != nil {
		writeProblem(w, http.StatusBadRequest, "BAD_REQUEST", "malformed JSON body")
		return
	}
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	ip := clientIP(r.RemoteAddr)
	ctx := r.Context()

	blocked, retryAfter, err := rateLimited(ctx, s.pool, req.Email, ip)
	if err != nil {
		s.log.Error("rate limit check", "err", err)
	} else if blocked {
		w.Header().Set("Retry-After", retryAfter.String())
		writeProblem(w, http.StatusTooManyRequests, "TOO_MANY_ATTEMPTS", "too many failed attempts — try again later")
		return
	}

	st := store.New(s.pool)
	user, err := st.GetUserByEmail(ctx, req.Email)
	if errors.Is(err, store.ErrNotFound) {
		recordLoginAttempt(ctx, s.pool, req.Email, ip, false)
		writeProblem(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "email or password is incorrect")
		return
	}
	if err != nil {
		s.log.Error("get user", "err", err)
		writeProblem(w, http.StatusInternalServerError, "INTERNAL", "")
		return
	}

	if err := auth.VerifyPassword(user.PasswordHash, req.Password); err != nil {
		recordLoginAttempt(ctx, s.pool, req.Email, ip, false)
		writeProblem(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "email or password is incorrect")
		return
	}
	recordLoginAttempt(ctx, s.pool, req.Email, ip, true)
	_ = st.TouchLastLogin(ctx, user.ID)

	s.respondWithNewSession(w, r, user)
}

// respondWithNewSession issues access+refresh+CSRF tokens for an
// already-authenticated user, sets the refresh cookie, and writes the full
// session payload (including the /me snapshot, so the frontend never needs
// a second round trip right after login).
func (s *Server) respondWithNewSession(w http.ResponseWriter, r *http.Request, user store.User) {
	ctx := r.Context()
	st := store.New(s.pool)

	memberID := ""
	if member, err := st.GetMemberByUserID(ctx, user.ID); err == nil {
		memberID = member.ID
	}

	access, err := auth.IssueAccessToken(s.cfg.JWTSecret, user.ID, user.Role, memberID, s.cfg.AccessTokenTTL)
	if err != nil {
		s.log.Error("issue access token", "err", err)
		writeProblem(w, http.StatusInternalServerError, "INTERNAL", "")
		return
	}
	rawRefresh, refreshHash, err := auth.NewRefreshToken()
	if err != nil {
		s.log.Error("issue refresh token", "err", err)
		writeProblem(w, http.StatusInternalServerError, "INTERNAL", "")
		return
	}
	rawCSRF, csrfHash, err := auth.NewCSRFToken()
	if err != nil {
		s.log.Error("issue csrf token", "err", err)
		writeProblem(w, http.StatusInternalServerError, "INTERNAL", "")
		return
	}
	expiresAt := time.Now().Add(s.cfg.RefreshTokenTTL)
	if _, err := st.InsertRefreshToken(ctx, user.ID, refreshHash, csrfHash, expiresAt, r.UserAgent(), clientIP(r.RemoteAddr)); err != nil {
		s.log.Error("store refresh token", "err", err)
		writeProblem(w, http.StatusInternalServerError, "INTERNAL", "")
		return
	}

	s.setRefreshCookie(w, rawRefresh, expiresAt)

	me, err := st.GetMeView(ctx, user.ID)
	if err != nil {
		s.log.Error("get me view", "err", err)
		writeProblem(w, http.StatusInternalServerError, "INTERNAL", "")
		return
	}

	writeJSON(w, http.StatusOK, sessionResponse{
		AccessToken: access,
		CSRFToken:   rawCSRF,
		ExpiresIn:   int(s.cfg.AccessTokenTTL.Seconds()),
		Me:          toMeDTO(me),
	})
}

func (s *Server) setRefreshCookie(w http.ResponseWriter, raw string, expiresAt time.Time) {
	c := s.cookieBase()
	c.Name = refreshCookieName
	c.Value = raw
	c.Expires = expiresAt
	http.SetCookie(w, &c)
}

func (s *Server) clearRefreshCookie(w http.ResponseWriter) {
	c := s.cookieBase()
	c.Name = refreshCookieName
	c.Value = ""
	c.MaxAge = -1
	http.SetCookie(w, &c)
}

func (s *Server) handleRefresh(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	cookie, err := r.Cookie(refreshCookieName)
	if err != nil || cookie.Value == "" {
		writeProblem(w, http.StatusUnauthorized, "NO_SESSION", "no refresh token presented")
		return
	}

	st := store.New(s.pool)
	tokenHash := auth.HashToken(cookie.Value)
	row, err := st.GetRefreshToken(ctx, tokenHash)
	if errors.Is(err, store.ErrNotFound) {
		writeProblem(w, http.StatusUnauthorized, "NO_SESSION", "unknown refresh token")
		return
	}
	if err != nil {
		s.log.Error("get refresh token", "err", err)
		writeProblem(w, http.StatusInternalServerError, "INTERNAL", "")
		return
	}

	if row.RevokedAt != nil {
		// A revoked token being presented again means it was copied out from
		// under the legitimate session — kill the whole family, not just
		// this token, and make the client start over.
		s.log.Warn("refresh token reuse detected", "user_id", row.UserID)
		_ = st.RevokeAllRefreshTokensForUser(ctx, row.UserID)
		s.clearRefreshCookie(w)
		writeProblem(w, http.StatusUnauthorized, "TOKEN_REUSE_DETECTED", "session revoked — please log in again")
		return
	}
	if time.Now().After(row.ExpiresAt) {
		s.clearRefreshCookie(w)
		writeProblem(w, http.StatusUnauthorized, "SESSION_EXPIRED", "session expired — please log in again")
		return
	}
	// No X-CSRF-Token check here (deliberately): the refresh cookie is
	// SameSite=Lax, so a cross-site page's fetch/XHR never carries it in
	// the first place — Lax only rides along on a top-level GET navigation,
	// never on the POST this endpoint requires — and the JSON response is
	// unreadable cross-origin regardless (CORS only allows cfg.CORSOrigin).
	// A CSRF header would only ever protect this exact request further,
	// and doing so breaks the one flow that needs to call refresh with
	// nothing yet in memory: minting a session from the cookie alone on a
	// fresh page load. csrf_token is still issued below for a future
	// deployment that can't rely on SameSite (e.g. a genuinely cross-site
	// frontend/API split), but this build doesn't require it back.

	user, err := st.GetUserByID(ctx, row.UserID)
	if err != nil {
		s.log.Error("get user for refresh", "err", err)
		writeProblem(w, http.StatusInternalServerError, "INTERNAL", "")
		return
	}

	memberID := ""
	if member, err := st.GetMemberByUserID(ctx, user.ID); err == nil {
		memberID = member.ID
	}
	access, err := auth.IssueAccessToken(s.cfg.JWTSecret, user.ID, user.Role, memberID, s.cfg.AccessTokenTTL)
	if err != nil {
		s.log.Error("issue access token", "err", err)
		writeProblem(w, http.StatusInternalServerError, "INTERNAL", "")
		return
	}

	rawRefresh, refreshHash, err := auth.NewRefreshToken()
	if err != nil {
		s.log.Error("issue refresh token", "err", err)
		writeProblem(w, http.StatusInternalServerError, "INTERNAL", "")
		return
	}
	rawCSRF, csrfHash, err := auth.NewCSRFToken()
	if err != nil {
		s.log.Error("issue csrf token", "err", err)
		writeProblem(w, http.StatusInternalServerError, "INTERNAL", "")
		return
	}
	expiresAt := time.Now().Add(s.cfg.RefreshTokenTTL)
	newID, err := st.InsertRefreshToken(ctx, user.ID, refreshHash, csrfHash, expiresAt, r.UserAgent(), clientIP(r.RemoteAddr))
	if err != nil {
		s.log.Error("store rotated refresh token", "err", err)
		writeProblem(w, http.StatusInternalServerError, "INTERNAL", "")
		return
	}
	if err := st.RevokeRefreshToken(ctx, row.ID, &newID); err != nil {
		s.log.Error("revoke old refresh token", "err", err)
	}

	s.setRefreshCookie(w, rawRefresh, expiresAt)

	// The frontend's only path to `me` after a fresh page load is this
	// response — bootSession() sets its whole auth state straight from it,
	// with no second round trip. Omitting Me here (as an earlier version
	// of this handler did) silently handed the app an empty member on
	// every reload, which is a lot uglier than an extra query on refresh.
	me, err := st.GetMeView(ctx, user.ID)
	if err != nil {
		s.log.Error("get me view for refresh", "err", err)
		writeProblem(w, http.StatusInternalServerError, "INTERNAL", "")
		return
	}

	writeJSON(w, http.StatusOK, sessionResponse{
		AccessToken: access,
		CSRFToken:   rawCSRF,
		ExpiresIn:   int(s.cfg.AccessTokenTTL.Seconds()),
		Me:          toMeDTO(me),
	})
}

func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {
	if cookie, err := r.Cookie(refreshCookieName); err == nil && cookie.Value != "" {
		st := store.New(s.pool)
		if row, err := st.GetRefreshToken(r.Context(), auth.HashToken(cookie.Value)); err == nil {
			_ = st.RevokeRefreshToken(r.Context(), row.ID, nil)
		}
	}
	s.clearRefreshCookie(w)
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r.Context())
	st := store.New(s.pool)
	me, err := st.GetMeView(r.Context(), claims.UserID)
	if errors.Is(err, store.ErrNotFound) {
		writeProblem(w, http.StatusNotFound, "NOT_FOUND", "")
		return
	}
	if err != nil {
		s.log.Error("get me", "err", err)
		writeProblem(w, http.StatusInternalServerError, "INTERNAL", "")
		return
	}
	writeJSON(w, http.StatusOK, toMeDTO(me))
}
