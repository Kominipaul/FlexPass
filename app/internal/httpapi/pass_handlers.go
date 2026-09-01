package httpapi

import (
	"encoding/base64"
	"net/http"

	"github.com/kominipaul/flexpass/app/internal/store"
)

type passResponse struct {
	MemberCode    string `json:"member_code"`
	DoorSecretB64 string `json:"door_secret_b64"`
	WindowSeconds int    `json:"window_seconds"`
}

// handleGetPass hands the frontend the one thing it needs to render a live,
// rotating pass entirely offline: the member's HMAC secret, base64-encoded.
// The frontend fetches this once per session (never persists it to
// localStorage) and recomputes the token itself every WindowSeconds.
func (s *Server) handleGetPass(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r.Context())
	st := store.New(s.pool)
	code, secret, err := st.GetDoorSecret(r.Context(), claims.MemberID)
	if err != nil {
		s.log.Error("get door secret", "err", err)
		writeProblem(w, http.StatusInternalServerError, "INTERNAL", "")
		return
	}
	writeJSON(w, http.StatusOK, passResponse{
		MemberCode:    code,
		DoorSecretB64: base64.StdEncoding.EncodeToString(secret),
		WindowSeconds: doorpassWindowSeconds,
	})
}
