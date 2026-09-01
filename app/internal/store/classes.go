package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

var (
	ErrClassCancelled  = errors.New("store: class is cancelled")
	ErrClassStarted    = errors.New("store: class has already started")
	ErrAlreadyBooked   = errors.New("store: member already holds a seat in this class")
	ErrBookingNotFound = errors.New("store: no active booking for this member in this class")
)

type ClassListItem struct {
	ID                                 string
	DisciplineCode                     string
	DisciplineIcon                     string
	DisciplineNameEl, DisciplineNameEn string
	TrainerNameEl, TrainerNameEn       string
	LocationCode                       string
	LocationNameEl, LocationNameEn     string
	StartsAt                           time.Time
	DurationMin                        int
	Capacity                           int
	Booked                             int
	Level                              string
	MyStatus                           *string // "booked" | "waitlisted" | nil
}

type ClassFilter struct {
	From, To       time.Time
	LocationCode   string // "" = any
	DisciplineCode string // "" = any
}

func (s *Store) ListClasses(ctx context.Context, memberID string, f ClassFilter) ([]ClassListItem, error) {
	rows, err := s.Pool.Query(ctx, `
		SELECT c.id, d.code, d.icon, d.name_el, d.name_en,
		       tr.name_el, tr.name_en,
		       l.code, l.name_el, l.name_en,
		       c.starts_at, c.duration_min, c.capacity,
		       COALESCE((SELECT count(*) FROM bookings b WHERE b.class_id = c.id AND b.status = 'booked'), 0),
		       c.level,
		       (SELECT b.status FROM bookings b WHERE b.class_id = c.id AND b.member_id = $1 AND b.status IN ('booked','waitlisted'))
		FROM classes c
		JOIN disciplines d ON d.id = c.discipline_id
		JOIN trainers tr   ON tr.id = c.trainer_id
		JOIN locations l   ON l.id = c.location_id
		WHERE c.status = 'scheduled'
		  AND c.starts_at BETWEEN $2 AND $3
		  AND ($4 = '' OR l.code = $4)
		  AND ($5 = '' OR d.code = $5)
		ORDER BY c.starts_at ASC
	`, memberID, f.From, f.To, f.LocationCode, f.DisciplineCode)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []ClassListItem
	for rows.Next() {
		var it ClassListItem
		if err := rows.Scan(&it.ID, &it.DisciplineCode, &it.DisciplineIcon, &it.DisciplineNameEl, &it.DisciplineNameEn,
			&it.TrainerNameEl, &it.TrainerNameEn, &it.LocationCode, &it.LocationNameEl, &it.LocationNameEn,
			&it.StartsAt, &it.DurationMin, &it.Capacity, &it.Booked, &it.Level, &it.MyStatus); err != nil {
			return nil, err
		}
		out = append(out, it)
	}
	return out, rows.Err()
}

// ClassDiscipline is the minimal lookup used for plan-gating a booking
// before opening the capacity transaction.
func (s *Store) ClassDiscipline(ctx context.Context, classID string) (disciplineCode string, err error) {
	err = s.Pool.QueryRow(ctx, `
		SELECT d.code FROM classes c JOIN disciplines d ON d.id = c.discipline_id WHERE c.id = $1
	`, classID).Scan(&disciplineCode)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	return disciplineCode, err
}

// CheapestPlanFor returns the lowest-priced active plan that includes the
// given discipline — what a 403 PLAN_UPGRADE_REQUIRED offers the member.
func (s *Store) CheapestPlanFor(ctx context.Context, disciplineCode string) (code, nameEl, nameEn string, priceCents int, err error) {
	err = s.Pool.QueryRow(ctx, `
		SELECT p.code, p.name_el, p.name_en, p.price_cents
		FROM plans p
		JOIN plan_discipline_access pda ON pda.plan_id = p.id
		JOIN disciplines d ON d.id = pda.discipline_id
		WHERE d.code = $1 AND p.active
		ORDER BY p.price_cents ASC
		LIMIT 1
	`, disciplineCode).Scan(&code, &nameEl, &nameEn, &priceCents)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", "", "", 0, ErrNotFound
	}
	return code, nameEl, nameEn, priceCents, err
}

// BookClass is the capacity-safe seat-or-waitlist transaction. Locking the
// classes row with FOR UPDATE serializes concurrent attempts on the same
// class — the second caller blocks until the first commits, then sees the
// up-to-date booked count, so two people can never win the last seat.
func (s *Store) BookClass(ctx context.Context, classID, memberID string) (status string, waitlistPos int, err error) {
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return "", 0, err
	}
	defer tx.Rollback(ctx)

	var capacity int
	var startsAt time.Time
	var classStatus string
	if err := tx.QueryRow(ctx,
		`SELECT capacity, starts_at, status FROM classes WHERE id = $1 FOR UPDATE`,
		classID,
	).Scan(&capacity, &startsAt, &classStatus); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", 0, ErrNotFound
		}
		return "", 0, err
	}
	if classStatus == "cancelled" {
		return "", 0, ErrClassCancelled
	}
	if !startsAt.After(time.Now()) {
		return "", 0, ErrClassStarted
	}

	var booked int
	if err := tx.QueryRow(ctx,
		`SELECT count(*) FROM bookings WHERE class_id = $1 AND status = 'booked'`, classID,
	).Scan(&booked); err != nil {
		return "", 0, err
	}

	if booked < capacity {
		if _, err := tx.Exec(ctx,
			`INSERT INTO bookings (class_id, member_id, status) VALUES ($1, $2, 'booked')`,
			classID, memberID); err != nil {
			if isUniqueViolation(err) {
				return "", 0, ErrAlreadyBooked
			}
			return "", 0, err
		}
		return "booked", 0, tx.Commit(ctx)
	}

	var nextPos int
	if err := tx.QueryRow(ctx,
		`SELECT COALESCE(max(waitlist_position), 0) + 1 FROM bookings WHERE class_id = $1 AND status = 'waitlisted'`,
		classID,
	).Scan(&nextPos); err != nil {
		return "", 0, err
	}
	if _, err := tx.Exec(ctx,
		`INSERT INTO bookings (class_id, member_id, status, waitlist_position) VALUES ($1, $2, 'waitlisted', $3)`,
		classID, memberID, nextPos); err != nil {
		if isUniqueViolation(err) {
			return "", 0, ErrAlreadyBooked
		}
		return "", 0, err
	}
	return "waitlisted", nextPos, tx.Commit(ctx)
}

// CancelBooking cancels the member's seat and, if they held a confirmed
// seat (not just a waitlist spot), promotes whoever is next in line inside
// the same transaction. Returns the promoted member's id, if any.
func (s *Store) CancelBooking(ctx context.Context, classID, memberID string) (promotedMemberID *string, err error) {
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// Lock the class row too, so this serializes with BookClass on the
	// same class — a cancel and a concurrent book can't interleave badly.
	var startsAt time.Time
	if err := tx.QueryRow(ctx, `SELECT starts_at FROM classes WHERE id = $1 FOR UPDATE`, classID).Scan(&startsAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	var bookingID, status string
	if err := tx.QueryRow(ctx, `
		SELECT id, status FROM bookings
		WHERE class_id = $1 AND member_id = $2 AND status IN ('booked','waitlisted')
		FOR UPDATE
	`, classID, memberID).Scan(&bookingID, &status); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrBookingNotFound
		}
		return nil, err
	}

	lateCancel := time.Until(startsAt) < 2*time.Hour
	if _, err := tx.Exec(ctx,
		`UPDATE bookings SET status = 'cancelled', cancelled_at = now(), late_cancel = $2 WHERE id = $1`,
		bookingID, lateCancel); err != nil {
		return nil, err
	}

	if status == "booked" {
		var promotedID, promotedMember string
		err := tx.QueryRow(ctx, `
			SELECT id, member_id FROM bookings
			WHERE class_id = $1 AND status = 'waitlisted'
			ORDER BY waitlist_position ASC LIMIT 1 FOR UPDATE
		`, classID).Scan(&promotedID, &promotedMember)
		if err == nil {
			if _, err := tx.Exec(ctx,
				`UPDATE bookings SET status = 'booked', waitlist_position = NULL WHERE id = $1`,
				promotedID); err != nil {
				return nil, err
			}
			promotedMemberID = &promotedMember
		} else if !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
	}

	return promotedMemberID, tx.Commit(ctx)
}

type MyBooking struct {
	ClassID                            string
	Status                             string
	WaitlistPos                        *int
	DisciplineCode                     string
	DisciplineNameEl, DisciplineNameEn string
	LocationCode                       string
	StartsAt                           time.Time
}

func (s *Store) ListMyBookings(ctx context.Context, memberID string) ([]MyBooking, error) {
	rows, err := s.Pool.Query(ctx, `
		SELECT b.class_id, b.status, b.waitlist_position, d.code, d.name_el, d.name_en, l.code, c.starts_at
		FROM bookings b
		JOIN classes c ON c.id = b.class_id
		JOIN disciplines d ON d.id = c.discipline_id
		JOIN locations l ON l.id = c.location_id
		WHERE b.member_id = $1 AND b.status IN ('booked','waitlisted')
		ORDER BY c.starts_at ASC
	`, memberID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []MyBooking
	for rows.Next() {
		var b MyBooking
		if err := rows.Scan(&b.ClassID, &b.Status, &b.WaitlistPos, &b.DisciplineCode,
			&b.DisciplineNameEl, &b.DisciplineNameEn, &b.LocationCode, &b.StartsAt); err != nil {
			return nil, err
		}
		out = append(out, b)
	}
	return out, rows.Err()
}
