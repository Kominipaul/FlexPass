package access

import (
	"testing"
	"time"
)

func TestEvaluate(t *testing.T) {
	now := time.Date(2026, 9, 1, 12, 0, 0, 0, time.UTC)
	day := func(offset int) time.Time { return now.AddDate(0, 0, offset) }

	cases := []struct {
		name       string
		status     string
		endsOn     time.Time
		allowedLoc []string
		reqLoc     string
		wantOK     bool
		wantReason string
	}{
		{"expired beats everything, even a matching location", "active", day(-1), []string{"ART", "PIL"}, "ART", false, ReasonExpired},
		{"ends today is still valid (inclusive)", "active", day(0), []string{"ART"}, "ART", true, ReasonExpiringSoon},
		{"frozen denies even with days remaining", "frozen", day(30), []string{"ART"}, "ART", false, ReasonFrozen},
		{"cancelled denies outright", "cancelled", day(30), []string{"ART"}, "ART", false, ReasonCancelled},
		{"wrong location denies a non-expired active member", "active", day(30), []string{"ART"}, "PIL", false, ReasonPlanLocation},
		{"premium at the Pilates studio is granted", "active", day(30), []string{"ART", "PIL"}, "PIL", true, ReasonActive},
		{"exactly 7 days left is expiring-soon", "active", day(7), []string{"ART"}, "ART", true, ReasonExpiringSoon},
		{"8 days left is plain active", "active", day(8), []string{"ART"}, "ART", true, ReasonActive},
		{"frozen takes priority over wrong location too", "frozen", day(30), []string{"ART"}, "PIL", false, ReasonFrozen},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := Evaluate(tc.status, tc.endsOn, tc.allowedLoc, tc.reqLoc, now)
			if got.OK != tc.wantOK || got.Reason != tc.wantReason {
				t.Fatalf("Evaluate() = {OK:%v Reason:%s}, want {OK:%v Reason:%s}",
					got.OK, got.Reason, tc.wantOK, tc.wantReason)
			}
		})
	}
}

func TestEvaluateDaysLeftNeverNegative(t *testing.T) {
	now := time.Date(2026, 9, 1, 12, 0, 0, 0, time.UTC)
	got := Evaluate("active", now.AddDate(0, 0, -10), []string{"ART"}, "ART", now)
	if got.DaysLeft != 0 {
		t.Fatalf("DaysLeft = %d, want 0 for an expired membership", got.DaysLeft)
	}
}
