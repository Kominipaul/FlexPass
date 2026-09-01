// Package access implements the door-access rule as a pure function. It
// knows nothing about HTTP or the database — callers resolve a membership
// to plain values first, which is what makes this exhaustively testable
// and keeps the rule identical whether it runs for a live door scan or a
// staff "what would happen if I scanned this member here" preview.
package access

import "time"

// Reason codes are the contract with every caller — API responses, the
// door log, and the frontend all key off these strings, never off English
// prose (the prose is rendered client-side in whichever language is
// active).
const (
	ReasonExpired      = "EXPIRED"
	ReasonFrozen       = "FROZEN"
	ReasonCancelled    = "CANCELLED"
	ReasonPlanLocation = "PLAN_LOCATION"
	ReasonExpiringSoon = "EXPIRING_SOON"
	ReasonActive       = "ACTIVE"
)

// ExpiringSoonWithinDays mirrors the prototype: 7 days or fewer remaining
// still grants access but is flagged for the front desk.
const ExpiringSoonWithinDays = 7

type Result struct {
	OK       bool
	Reason   string
	DaysLeft int
}

// Evaluate runs the access rule in a fixed order — the order is the rule,
// not an implementation detail: expired beats frozen beats wrong-location,
// because a staff member reading the reason off a denial needs the one
// that's actually actionable first.
func Evaluate(status string, endsOn time.Time, allowedLocationCodes []string, requestedLocationCode string, now time.Time) Result {
	today := truncateToDate(now)
	end := truncateToDate(endsOn)
	daysLeft := int(end.Sub(today).Hours() / 24)
	if daysLeft < 0 {
		daysLeft = 0
	}

	switch {
	case status == "cancelled":
		return Result{OK: false, Reason: ReasonCancelled, DaysLeft: 0}
	case end.Before(today):
		return Result{OK: false, Reason: ReasonExpired, DaysLeft: 0}
	case status == "frozen":
		return Result{OK: false, Reason: ReasonFrozen, DaysLeft: daysLeft}
	case !contains(allowedLocationCodes, requestedLocationCode):
		return Result{OK: false, Reason: ReasonPlanLocation, DaysLeft: daysLeft}
	case daysLeft <= ExpiringSoonWithinDays:
		return Result{OK: true, Reason: ReasonExpiringSoon, DaysLeft: daysLeft}
	default:
		return Result{OK: true, Reason: ReasonActive, DaysLeft: daysLeft}
	}
}

func truncateToDate(t time.Time) time.Time {
	y, m, d := t.Date()
	return time.Date(y, m, d, 0, 0, 0, 0, t.Location())
}

func contains(list []string, want string) bool {
	for _, v := range list {
		if v == want {
			return true
		}
	}
	return false
}
