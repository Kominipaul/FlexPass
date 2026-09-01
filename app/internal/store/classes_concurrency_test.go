package store

// Integration test against a real Postgres — the concurrency guarantee
// this exercises (a *pgxpool.Pool row lock) cannot be verified against a
// mock. Skips cleanly if DATABASE_URL isn't set (e.g. `go test ./...`
// without a database available), and runs for real under
// TestMain/CI where it is.

import (
	"context"
	"crypto/rand"
	"fmt"
	"os"
	"sync"
	"testing"

	"github.com/kominipaul/flexpass/app/internal/db"
)

func testStore(t *testing.T) *Store {
	t.Helper()
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		t.Skip("DATABASE_URL not set — skipping integration test")
	}
	pool, err := db.NewPool(context.Background(), url)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	return New(pool)
}

// makeTestMember inserts a throwaway user+member directly (bypassing the
// HTTP registration flow, which this package doesn't depend on) so the
// concurrency test can spin up many members cheaply.
func makeTestMember(t *testing.T, ctx context.Context, s *Store, locationCode string) string {
	t.Helper()
	var userID string
	email := fmt.Sprintf("concurrency-test-%s@example.test", randHex(t))
	if err := s.Pool.QueryRow(ctx,
		`INSERT INTO users (email, password_hash, role) VALUES ($1, 'x', 'member') RETURNING id`,
		email,
	).Scan(&userID); err != nil {
		t.Fatalf("insert user: %v", err)
	}
	secret := make([]byte, 32)
	_, _ = rand.Read(secret)
	var memberID string
	if err := s.Pool.QueryRow(ctx, `
		INSERT INTO members (user_id, member_code, first_name, last_name, home_location_id, door_secret)
		SELECT $1, 'TST-' || nextval('member_code_seq'), 'Test', 'Member', l.id, $3
		FROM locations l WHERE l.code = $2
		RETURNING id
	`, userID, locationCode, secret).Scan(&memberID); err != nil {
		t.Fatalf("insert member: %v", err)
	}
	return memberID
}

func randHex(t *testing.T) string {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		t.Fatalf("rand: %v", err)
	}
	return fmt.Sprintf("%x", b)
}

// makeTestClass inserts a class starting one hour from now with the given
// capacity, using whatever reference data the seed left in place.
func makeTestClass(t *testing.T, ctx context.Context, s *Store, capacity int) string {
	t.Helper()
	var classID string
	err := s.Pool.QueryRow(ctx, `
		INSERT INTO classes (location_id, discipline_id, trainer_id, starts_at, duration_min, capacity)
		SELECT l.id, d.id, tr.id, now() + interval '1 hour', 45, $1
		FROM locations l, disciplines d, trainers tr
		WHERE l.code = 'ART' AND d.code = 'functional'
		LIMIT 1
		RETURNING id
	`, capacity).Scan(&classID)
	if err != nil {
		t.Fatalf("insert class (did you run `go run ./cmd/seed` against this database first?): %v", err)
	}
	return classID
}

// TestBookClassConcurrentOverbooking is the guarantee the build brief asks
// for by name: fire many simultaneous booking attempts at a class with a
// small capacity and confirm exactly `capacity` end up booked, the rest
// are waitlisted with distinct positions, and nobody is double-counted.
func TestBookClassConcurrentOverbooking(t *testing.T) {
	s := testStore(t)
	ctx := context.Background()

	const capacity = 3
	const attempts = 12

	classID := makeTestClass(t, ctx, s, capacity)
	memberIDs := make([]string, attempts)
	for i := range memberIDs {
		memberIDs[i] = makeTestMember(t, ctx, s, "ART")
	}

	var wg sync.WaitGroup
	results := make([]string, attempts)
	errs := make([]error, attempts)
	start := make(chan struct{})

	for i := 0; i < attempts; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			<-start // release every goroutine at (as close to) the same instant
			status, _, err := s.BookClass(ctx, classID, memberIDs[i])
			results[i], errs[i] = status, err
		}(i)
	}
	close(start)
	wg.Wait()

	var booked, waitlisted int
	for i, status := range results {
		if errs[i] != nil {
			t.Fatalf("attempt %d: unexpected error: %v", i, errs[i])
		}
		switch status {
		case "booked":
			booked++
		case "waitlisted":
			waitlisted++
		default:
			t.Fatalf("attempt %d: unexpected status %q", i, status)
		}
	}

	if booked != capacity {
		t.Fatalf("booked = %d, want exactly capacity (%d)", booked, capacity)
	}
	if waitlisted != attempts-capacity {
		t.Fatalf("waitlisted = %d, want %d", waitlisted, attempts-capacity)
	}

	// The database, not just the Go-side tally, must agree: exactly
	// `capacity` confirmed seats and correct total participants.
	var dbBooked, dbTotal int
	if err := s.Pool.QueryRow(ctx,
		`SELECT count(*) FILTER (WHERE status = 'booked'), count(*) FROM bookings WHERE class_id = $1`,
		classID).Scan(&dbBooked, &dbTotal); err != nil {
		t.Fatalf("verify in db: %v", err)
	}
	if dbBooked != capacity {
		t.Fatalf("db booked count = %d, want %d", dbBooked, capacity)
	}
	if dbTotal != attempts {
		t.Fatalf("db total bookings = %d, want %d (one per attempt, no duplicates/drops)", dbTotal, attempts)
	}

	// Waitlist positions must be a dense, gap-free, duplicate-free sequence
	// 1..N — proof the "next position" read-then-insert wasn't racy either.
	rows, err := s.Pool.Query(ctx,
		`SELECT waitlist_position FROM bookings WHERE class_id = $1 AND status = 'waitlisted' ORDER BY waitlist_position`,
		classID)
	if err != nil {
		t.Fatalf("query waitlist positions: %v", err)
	}
	defer rows.Close()
	want := 1
	for rows.Next() {
		var pos int
		if err := rows.Scan(&pos); err != nil {
			t.Fatalf("scan: %v", err)
		}
		if pos != want {
			t.Fatalf("waitlist positions have a gap or duplicate: got %d, want %d", pos, want)
		}
		want++
	}
}

// TestCancelPromotesWaitlistHead fills a class, cancels the confirmed
// seat, and confirms the earliest waitlisted member is promoted — in the
// same transaction, per the store implementation.
func TestCancelPromotesWaitlistHead(t *testing.T) {
	s := testStore(t)
	ctx := context.Background()

	classID := makeTestClass(t, ctx, s, 1)
	first := makeTestMember(t, ctx, s, "ART")
	second := makeTestMember(t, ctx, s, "ART")

	status, _, err := s.BookClass(ctx, classID, first)
	if err != nil || status != "booked" {
		t.Fatalf("first booking: status=%q err=%v", status, err)
	}
	status, pos, err := s.BookClass(ctx, classID, second)
	if err != nil || status != "waitlisted" || pos != 1 {
		t.Fatalf("second booking: status=%q pos=%d err=%v", status, pos, err)
	}

	promoted, err := s.CancelBooking(ctx, classID, first)
	if err != nil {
		t.Fatalf("cancel: %v", err)
	}
	if promoted == nil || *promoted != second {
		t.Fatalf("promoted = %v, want %q", promoted, second)
	}

	var secondStatus string
	if err := s.Pool.QueryRow(ctx,
		`SELECT status FROM bookings WHERE class_id = $1 AND member_id = $2`,
		classID, second).Scan(&secondStatus); err != nil {
		t.Fatalf("query promoted booking: %v", err)
	}
	if secondStatus != "booked" {
		t.Fatalf("promoted member's booking status = %q, want %q", secondStatus, "booked")
	}
}
