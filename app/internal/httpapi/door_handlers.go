package httpapi

import (
	"errors"
	"net/http"
	"time"

	"github.com/kominipaul/flexpass/app/internal/access"
	"github.com/kominipaul/flexpass/app/internal/doorpass"
	"github.com/kominipaul/flexpass/app/internal/store"
)

// doorpassWindowSeconds re-exports the rotation cadence for the JSON
// response so the frontend never hardcodes it separately from the package
// that actually enforces it.
const doorpassWindowSeconds = doorpass.WindowSeconds

type doorVerifyRequest struct {
	// Payload is the full QR contents: "<member_code>:<token>".
	Payload      string `json:"payload"`
	LocationCode string `json:"location_code"`
}

type doorVerifyResponse struct {
	OK         bool      `json:"ok"`
	Reason     string    `json:"reason"`
	DaysLeft   int       `json:"days_left"`
	MemberName string    `json:"member_name,omitempty"`
	MemberCode string    `json:"member_code,omitempty"`
	Plan       Bilingual `json:"plan,omitempty"`
}

// handleDoorVerify is today reachable by any authenticated user — there is
// no staff/device layer yet (that's the next milestone), so for now this
// exists to prove the cryptography and the access rule are correct
// end-to-end. Before a real turnstile calls this, it must move behind
// device auth (Authorization: Device <api_key>, checked against
// door_devices) scoped to one location, per the build brief.
func (s *Server) handleDoorVerify(w http.ResponseWriter, r *http.Request) {
	var req doorVerifyRequest
	if err := decodeJSON(r, &req); err != nil {
		writeProblem(w, http.StatusBadRequest, "BAD_REQUEST", "malformed JSON body")
		return
	}

	memberCode, token, ok := doorpass.Decode(req.Payload)
	if !ok {
		writeProblem(w, http.StatusBadRequest, "BAD_PAYLOAD", "payload is not '<member_code>:<token>'")
		return
	}

	ctx := r.Context()
	st := store.New(s.pool)
	snap, err := st.GetAccessSnapshotByCode(ctx, memberCode)
	if errors.Is(err, store.ErrNotFound) {
		writeJSON(w, http.StatusOK, doorVerifyResponse{OK: false, Reason: "UNKNOWN_MEMBER"})
		return
	}
	if err != nil {
		s.log.Error("get access snapshot", "err", err)
		writeProblem(w, http.StatusInternalServerError, "INTERNAL", "")
		return
	}

	now := time.Now()
	valid, matchedWindow := doorpass.Verify(snap.DoorSecret, token, now)
	if !valid {
		_ = st.InsertCheckIn(ctx, &snap.MemberID, req.LocationCode, "denied", "INVALID_TOKEN", nil)
		writeJSON(w, http.StatusOK, doorVerifyResponse{OK: false, Reason: "INVALID_TOKEN"})
		return
	}

	if replayed, err := st.ReplayExists(ctx, snap.MemberID, matchedWindow); err == nil && replayed {
		_ = st.InsertCheckIn(ctx, &snap.MemberID, req.LocationCode, "denied", "REPLAY", &matchedWindow)
		writeJSON(w, http.StatusOK, doorVerifyResponse{OK: false, Reason: "REPLAY"})
		return
	}

	result := access.Evaluate(snap.MembershipStatus, snap.EndsOn, snap.AllowedLocationCodes, req.LocationCode, now)

	outcome := "denied"
	if result.OK {
		outcome = "granted"
	}
	if err := st.InsertCheckIn(ctx, &snap.MemberID, req.LocationCode, outcome, result.Reason, &matchedWindow); errors.Is(err, store.ErrReplay) {
		// Lost a race against a concurrent verify for this exact window —
		// the unique index caught what ReplayExists' read missed.
		writeJSON(w, http.StatusOK, doorVerifyResponse{OK: false, Reason: "REPLAY"})
		return
	} else if err != nil {
		s.log.Error("insert check-in", "err", err)
	}

	writeJSON(w, http.StatusOK, doorVerifyResponse{
		OK: result.OK, Reason: result.Reason, DaysLeft: result.DaysLeft,
		MemberName: snap.FirstName + " " + snap.LastName,
		MemberCode: snap.MemberCode,
		Plan:       Bilingual{El: snap.PlanNameEl, En: snap.PlanNameEn},
	})
}
