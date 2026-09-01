package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

// AccessSnapshot is everything the door-access rule needs, resolved in one
// query so a scan is a single round trip.
type AccessSnapshot struct {
	MemberID             string
	MemberCode           string
	FirstName            string
	LastName             string
	DoorSecret           []byte
	MembershipStatus     string
	EndsOn               time.Time
	PlanCode             string
	PlanNameEl           string
	PlanNameEn           string
	AllowedLocationCodes []string
}

func (s *Store) GetAccessSnapshotByCode(ctx context.Context, memberCode string) (AccessSnapshot, error) {
	var a AccessSnapshot
	err := s.Pool.QueryRow(ctx, `
		SELECT m.id, m.member_code, m.first_name, m.last_name, m.door_secret,
		       ms.status, ms.ends_on, p.code, p.name_el, p.name_en,
		       COALESCE((SELECT array_agg(l.code ORDER BY l.code)
		                 FROM plan_location_access pla JOIN locations l ON l.id = pla.location_id
		                 WHERE pla.plan_id = p.id), '{}')
		FROM members m
		JOIN memberships ms ON ms.member_id = m.id AND ms.status <> 'cancelled'
		JOIN plans p ON p.id = ms.plan_id
		WHERE m.member_code = $1
	`, memberCode).Scan(&a.MemberID, &a.MemberCode, &a.FirstName, &a.LastName, &a.DoorSecret,
		&a.MembershipStatus, &a.EndsOn, &a.PlanCode, &a.PlanNameEl, &a.PlanNameEn, &a.AllowedLocationCodes)
	if errors.Is(err, pgx.ErrNoRows) {
		return AccessSnapshot{}, ErrNotFound
	}
	return a, err
}

// GetDoorSecret returns just the member_code and door_secret for the
// authenticated member — what /me/pass hands the frontend so it can
// compute rotating tokens locally without a network round trip.
func (s *Store) GetDoorSecret(ctx context.Context, memberID string) (memberCode string, secret []byte, err error) {
	err = s.Pool.QueryRow(ctx,
		`SELECT member_code, door_secret FROM members WHERE id = $1`, memberID,
	).Scan(&memberCode, &secret)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil, ErrNotFound
	}
	return memberCode, secret, err
}

// ReplayExists is the replay guard, keyed on the exact HMAC rotation
// window a grant was already issued for — not on wall-clock recency.
// Recency alone would also block a second, entirely legitimate visit made
// on a fresh token moments later; the same window producing two grants is
// what actually means "this QR was replayed."
func (s *Store) ReplayExists(ctx context.Context, memberID string, matchedWindow int64) (bool, error) {
	var exists bool
	err := s.Pool.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM check_ins
			WHERE member_id = $1 AND result = 'granted' AND matched_window = $2
		)`, memberID, matchedWindow).Scan(&exists)
	return exists, err
}

var ErrReplay = errors.New("store: this token already produced a grant")

func (s *Store) InsertCheckIn(ctx context.Context, memberID *string, locationCode, result, reasonCode string, matchedWindow *int64) error {
	_, err := s.Pool.Exec(ctx, `
		INSERT INTO check_ins (member_id, location_id, result, reason_code, matched_window)
		SELECT $1, l.id, $3, $4, $5 FROM locations l WHERE l.code = $2
	`, memberID, locationCode, result, reasonCode, matchedWindow)
	if isUniqueViolation(err) {
		// The check_ins_replay_idx unique index is the backstop for a race
		// between two concurrent verify calls for the same member+window —
		// ReplayExists above is the fast path, this is the guarantee.
		return ErrReplay
	}
	return err
}
