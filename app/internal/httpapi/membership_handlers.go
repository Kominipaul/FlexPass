package httpapi

import (
	"errors"
	"net/http"

	"github.com/kominipaul/flexpass/app/internal/store"
)

type freezeRequest struct {
	Weeks int `json:"weeks"`
}

// validFreezeWeeks matches the three choices offered on the freeze dialog.
var validFreezeWeeks = map[int]bool{2: true, 4: true, 8: true}

func (s *Server) handleFreeze(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r.Context())
	var req freezeRequest
	if err := decodeJSON(r, &req); err != nil || !validFreezeWeeks[req.Weeks] {
		writeProblem(w, http.StatusBadRequest, "INVALID_WEEKS", "weeks must be 2, 4, or 8")
		return
	}

	st := store.New(s.pool)
	fee, err := st.FreezeMembership(r.Context(), claims.MemberID, req.Weeks)
	switch {
	case errors.Is(err, store.ErrNoMembership):
		writeProblem(w, http.StatusConflict, "NO_MEMBERSHIP", "")
	case errors.Is(err, store.ErrAlreadyFrozen):
		writeProblem(w, http.StatusConflict, "ALREADY_FROZEN", "membership is already frozen")
	case err != nil:
		s.log.Error("freeze membership", "err", err)
		writeProblem(w, http.StatusInternalServerError, "INTERNAL", "")
	default:
		writeJSON(w, http.StatusOK, map[string]int{"fee_cents": fee})
	}
}

func (s *Server) handleUnfreeze(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r.Context())
	st := store.New(s.pool)
	newEndsOn, err := st.UnfreezeMembership(r.Context(), claims.MemberID)
	switch {
	case errors.Is(err, store.ErrNoMembership):
		writeProblem(w, http.StatusConflict, "NO_MEMBERSHIP", "")
	case errors.Is(err, store.ErrNotFrozen):
		writeProblem(w, http.StatusConflict, "NOT_FROZEN", "membership is not frozen")
	case err != nil:
		s.log.Error("unfreeze membership", "err", err)
		writeProblem(w, http.StatusInternalServerError, "INTERNAL", "")
	default:
		writeJSON(w, http.StatusOK, map[string]string{"ends_on": newEndsOn.Format("2006-01-02")})
	}
}

func (s *Server) handleRenew(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r.Context())
	st := store.New(s.pool)
	newEndsOn, charged, err := st.RenewMembership(r.Context(), claims.MemberID)
	switch {
	case errors.Is(err, store.ErrNoMembership):
		writeProblem(w, http.StatusConflict, "NO_MEMBERSHIP", "")
	case err != nil:
		s.log.Error("renew membership", "err", err)
		writeProblem(w, http.StatusInternalServerError, "INTERNAL", "")
	default:
		writeJSON(w, http.StatusOK, map[string]any{
			"ends_on":       newEndsOn.Format("2006-01-02"),
			"charged_cents": charged,
		})
	}
}

type changePlanRequest struct {
	PlanCode string `json:"plan_code"`
}

func (s *Server) handleChangePlan(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r.Context())
	var req changePlanRequest
	if err := decodeJSON(r, &req); err != nil || req.PlanCode == "" {
		writeProblem(w, http.StatusBadRequest, "BAD_REQUEST", "plan_code is required")
		return
	}

	st := store.New(s.pool)
	prorated, err := st.ChangePlan(r.Context(), claims.MemberID, req.PlanCode)
	switch {
	case errors.Is(err, store.ErrNoMembership):
		writeProblem(w, http.StatusConflict, "NO_MEMBERSHIP", "")
	case errors.Is(err, store.ErrNotFound):
		writeProblem(w, http.StatusBadRequest, "UNKNOWN_PLAN", "plan_code does not match a known plan")
	case err != nil:
		s.log.Error("change plan", "err", err)
		writeProblem(w, http.StatusInternalServerError, "INTERNAL", "")
	default:
		writeJSON(w, http.StatusOK, map[string]int{"prorated_cents": prorated})
	}
}
