package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

var (
	ErrAlreadyFrozen = errors.New("store: membership is already frozen")
	ErrNotFrozen     = errors.New("store: membership is not frozen")
)

type CurrentMembership struct {
	ID         string
	PlanID     string
	PlanCode   string
	PriceCents int
	StartsOn   time.Time
	EndsOn     time.Time
	Status     string
}

func (s *Store) GetCurrentMembership(ctx context.Context, memberID string) (CurrentMembership, error) {
	var m CurrentMembership
	err := s.Pool.QueryRow(ctx, `
		SELECT ms.id, ms.plan_id, p.code, ms.price_cents, ms.starts_on, ms.ends_on, ms.status
		FROM memberships ms JOIN plans p ON p.id = ms.plan_id
		WHERE ms.member_id = $1 AND ms.status <> 'cancelled'
	`, memberID).Scan(&m.ID, &m.PlanID, &m.PlanCode, &m.PriceCents, &m.StartsOn, &m.EndsOn, &m.Status)
	if errors.Is(err, pgx.ErrNoRows) {
		return CurrentMembership{}, ErrNoMembership
	}
	return m, err
}

// freezeFeeCents matches the prototype's stated policy: a freeze longer
// than four weeks carries a flat hold fee, billed at the next renewal.
const freezeFeeThresholdWeeks = 4
const freezeFeeCents = 900

// FreezeMembership pauses billing and records the freeze window. The fee,
// if any, is invoiced as 'pending' rather than charged immediately — it
// rides the next renewal, same as the copy on the freeze dialog promises.
func (s *Store) FreezeMembership(ctx context.Context, memberID string, weeks int) (feeCents int, err error) {
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	var membershipID, status string
	if err := tx.QueryRow(ctx,
		`SELECT id, status FROM memberships WHERE member_id = $1 AND status <> 'cancelled'`, memberID,
	).Scan(&membershipID, &status); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, ErrNoMembership
		}
		return 0, err
	}
	if status == "frozen" {
		return 0, ErrAlreadyFrozen
	}

	if weeks > freezeFeeThresholdWeeks {
		feeCents = freezeFeeCents
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO membership_freezes (membership_id, starts_on, ends_on, days_held, fee_cents)
		VALUES ($1, current_date, current_date + ($2 * 7)::int, $2 * 7, $3)
	`, membershipID, weeks, feeCents); err != nil {
		return 0, err
	}
	if _, err := tx.Exec(ctx,
		`UPDATE memberships SET status = 'frozen' WHERE id = $1`, membershipID); err != nil {
		return 0, err
	}

	if feeCents > 0 {
		if _, err := s.CreateInvoice(ctx, tx, memberID,
			"Τέλος παύσης συνδρομής", "Membership freeze fee",
			feeCents, "pending", ""); err != nil {
			return 0, err
		}
	}

	return feeCents, tx.Commit(ctx)
}

// UnfreezeMembership extends ends_on by the number of days actually
// elapsed since the freeze began — not the originally requested weeks —
// so a member who unfreezes early only loses the days they were really
// paused for.
func (s *Store) UnfreezeMembership(ctx context.Context, memberID string) (newEndsOn time.Time, err error) {
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return time.Time{}, err
	}
	defer tx.Rollback(ctx)

	var membershipID string
	var endsOn time.Time
	var status string
	if err := tx.QueryRow(ctx,
		`SELECT id, ends_on, status FROM memberships WHERE member_id = $1 AND status <> 'cancelled'`, memberID,
	).Scan(&membershipID, &endsOn, &status); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return time.Time{}, ErrNoMembership
		}
		return time.Time{}, err
	}
	if status != "frozen" {
		return time.Time{}, ErrNotFrozen
	}

	var freezeStart time.Time
	if err := tx.QueryRow(ctx, `
		SELECT starts_on FROM membership_freezes
		WHERE membership_id = $1 ORDER BY created_at DESC LIMIT 1
	`, membershipID).Scan(&freezeStart); err != nil {
		return time.Time{}, err
	}

	heldDays := int(time.Now().Truncate(24*time.Hour).Sub(freezeStart).Hours() / 24)
	if heldDays < 0 {
		heldDays = 0
	}
	newEndsOn = endsOn.AddDate(0, 0, heldDays)

	if _, err := tx.Exec(ctx,
		`UPDATE memberships SET status = 'active', ends_on = $2 WHERE id = $1`,
		membershipID, newEndsOn); err != nil {
		return time.Time{}, err
	}
	return newEndsOn, tx.Commit(ctx)
}

// RenewMembership adds 30 days, charged at the plan's current price.
// Renewing from an expired state reactivates the membership starting
// today rather than stacking days onto a date already in the past.
func (s *Store) RenewMembership(ctx context.Context, memberID string) (newEndsOn time.Time, chargedCents int, err error) {
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return time.Time{}, 0, err
	}
	defer tx.Rollback(ctx)

	var membershipID, planNameEl, planNameEn string
	var endsOn time.Time
	var priceCents int
	if err := tx.QueryRow(ctx, `
		SELECT ms.id, ms.ends_on, ms.price_cents, p.name_el, p.name_en
		FROM memberships ms JOIN plans p ON p.id = ms.plan_id
		WHERE ms.member_id = $1 AND ms.status <> 'cancelled'
	`, memberID).Scan(&membershipID, &endsOn, &priceCents, &planNameEl, &planNameEn); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return time.Time{}, 0, ErrNoMembership
		}
		return time.Time{}, 0, err
	}

	today := time.Now().Truncate(24 * time.Hour)
	base := endsOn
	if base.Before(today) {
		base = today
	}
	newEndsOn = base.AddDate(0, 0, 30)

	if _, err := tx.Exec(ctx,
		`UPDATE memberships SET status = 'active', ends_on = $2 WHERE id = $1`,
		membershipID, newEndsOn); err != nil {
		return time.Time{}, 0, err
	}
	if _, err := s.CreateInvoice(ctx, tx, memberID,
		planNameEl+" · Μηνιαία ανανέωση", planNameEn+" · Monthly renewal",
		priceCents, "paid", "Visa ·· 4417"); err != nil {
		return time.Time{}, 0, err
	}

	return newEndsOn, priceCents, tx.Commit(ctx)
}

// ChangePlan switches the member's plan effective immediately, billing (or
// crediting) the prorated difference for the days remaining in the current
// term. starts_on/ends_on are unchanged — only the plan and its price.
func (s *Store) ChangePlan(ctx context.Context, memberID, newPlanCode string) (proratedCents int, err error) {
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	var membershipID string
	var endsOn time.Time
	var oldPriceCents int
	var oldNameEl, oldNameEn string
	if err := tx.QueryRow(ctx, `
		SELECT ms.id, ms.ends_on, ms.price_cents, p.name_el, p.name_en
		FROM memberships ms JOIN plans p ON p.id = ms.plan_id
		WHERE ms.member_id = $1 AND ms.status <> 'cancelled'
	`, memberID).Scan(&membershipID, &endsOn, &oldPriceCents, &oldNameEl, &oldNameEn); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, ErrNoMembership
		}
		return 0, err
	}

	var newPlanID string
	var newPriceCents int
	var newNameEl, newNameEn string
	if err := tx.QueryRow(ctx,
		`SELECT id, price_cents, name_el, name_en FROM plans WHERE code = $1 AND active`, newPlanCode,
	).Scan(&newPlanID, &newPriceCents, &newNameEl, &newNameEn); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, ErrNotFound
		}
		return 0, err
	}

	remainingDays := int(time.Until(endsOn).Hours() / 24)
	if remainingDays < 0 {
		remainingDays = 0
	}
	proratedCents = int((float64(newPriceCents-oldPriceCents) / 30.0) * float64(remainingDays))

	if _, err := tx.Exec(ctx,
		`UPDATE memberships SET plan_id = $2, price_cents = $3 WHERE id = $1`,
		membershipID, newPlanID, newPriceCents); err != nil {
		return 0, err
	}

	if proratedCents != 0 {
		status := "pending"
		amount := proratedCents
		if proratedCents < 0 {
			status = "refunded"
			amount = -proratedCents
		}
		descEl := "Αλλαγή πακέτου: " + oldNameEl + " → " + newNameEl
		descEn := "Plan change: " + oldNameEn + " → " + newNameEn
		if _, err := s.CreateInvoice(ctx, tx, memberID, descEl, descEn, amount, status, ""); err != nil {
			return 0, err
		}
	}

	return proratedCents, tx.Commit(ctx)
}
