package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

// MeView is the single joined snapshot the frontend needs on boot: who the
// user is, their member profile, their current membership, the plan behind
// it, and exactly which locations/disciplines that plan unlocks (the same
// access matrix the booking and door-scan rules enforce server-side, handed
// to the client so it can grey out what it already knows is off-limits).
type MeView struct {
	UserID string
	Email  string
	Role   string
	Locale string
	Member *MemberView
}

type MemberView struct {
	ID                 string
	MemberCode         string
	FirstName          string
	LastName           string
	Phone              *string
	JoinedOn           time.Time
	HomeLocationCode   string
	HomeLocationNameEl string
	HomeLocationNameEn string
	Membership         MembershipView
}

type MembershipView struct {
	ID                     string
	PlanCode               string
	PlanNameEl             string
	PlanNameEn             string
	PriceCents             int
	StartsOn               time.Time
	EndsOn                 time.Time
	Status                 string
	AutoRenew              bool
	AllowedLocationCodes   []string
	AllowedDisciplineCodes []string
}

var ErrNoMembership = errors.New("store: member has no membership")

func (s *Store) GetMeView(ctx context.Context, userID string) (MeView, error) {
	var v MeView
	err := s.Pool.QueryRow(ctx, `
		SELECT id, email, role, locale FROM users WHERE id = $1
	`, userID).Scan(&v.UserID, &v.Email, &v.Role, &v.Locale)
	if errors.Is(err, pgx.ErrNoRows) {
		return MeView{}, ErrNotFound
	}
	if err != nil {
		return MeView{}, err
	}

	mv, err := s.getMemberView(ctx, userID)
	if errors.Is(err, ErrNotFound) {
		return v, nil // staff/admin: no member row, that's fine
	}
	if err != nil {
		return MeView{}, err
	}
	v.Member = &mv
	return v, nil
}

func (s *Store) getMemberView(ctx context.Context, userID string) (MemberView, error) {
	var mv MemberView
	err := s.Pool.QueryRow(ctx, `
		SELECT m.id, m.member_code, m.first_name, m.last_name, m.phone, m.joined_on,
		       l.code, l.name_el, l.name_en
		FROM members m JOIN locations l ON l.id = m.home_location_id
		WHERE m.user_id = $1
	`, userID).Scan(&mv.ID, &mv.MemberCode, &mv.FirstName, &mv.LastName, &mv.Phone, &mv.JoinedOn,
		&mv.HomeLocationCode, &mv.HomeLocationNameEl, &mv.HomeLocationNameEn)
	if errors.Is(err, pgx.ErrNoRows) {
		return MemberView{}, ErrNotFound
	}
	if err != nil {
		return MemberView{}, err
	}

	membership, err := s.getMembershipView(ctx, mv.ID)
	if err != nil {
		return MemberView{}, err
	}
	mv.Membership = membership
	return mv, nil
}

func (s *Store) getMembershipView(ctx context.Context, memberID string) (MembershipView, error) {
	var mv MembershipView
	err := s.Pool.QueryRow(ctx, `
		SELECT ms.id, p.code, p.name_el, p.name_en, ms.price_cents,
		       ms.starts_on, ms.ends_on, ms.status, ms.auto_renew,
		       COALESCE((SELECT array_agg(l.code ORDER BY l.code)
		                 FROM plan_location_access pla JOIN locations l ON l.id = pla.location_id
		                 WHERE pla.plan_id = p.id), '{}'),
		       COALESCE((SELECT array_agg(d.code ORDER BY d.code)
		                 FROM plan_discipline_access pda JOIN disciplines d ON d.id = pda.discipline_id
		                 WHERE pda.plan_id = p.id), '{}')
		FROM memberships ms JOIN plans p ON p.id = ms.plan_id
		WHERE ms.member_id = $1 AND ms.status <> 'cancelled'
	`, memberID).Scan(&mv.ID, &mv.PlanCode, &mv.PlanNameEl, &mv.PlanNameEn, &mv.PriceCents,
		&mv.StartsOn, &mv.EndsOn, &mv.Status, &mv.AutoRenew,
		&mv.AllowedLocationCodes, &mv.AllowedDisciplineCodes)
	if errors.Is(err, pgx.ErrNoRows) {
		return MembershipView{}, ErrNoMembership
	}
	return mv, err
}
