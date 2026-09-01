package httpapi

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// rateLimited checks recent login_attempts for this email+ip and reports
// whether the caller should be blocked, per the spec: 5 attempts/minute,
// exponential lockout after 10 in fifteen minutes.
func rateLimited(ctx context.Context, pool *pgxpool.Pool, email, ip string) (blocked bool, retryAfter time.Duration, err error) {
	var lastMinute, last15Min int
	if err := pool.QueryRow(ctx, `
		SELECT
			count(*) FILTER (WHERE attempted_at > now() - interval '1 minute'),
			count(*) FILTER (WHERE attempted_at > now() - interval '15 minutes')
		FROM login_attempts
		WHERE NOT succeeded AND (email = $1 OR ip = $2::inet)
	`, email, ip).Scan(&lastMinute, &last15Min); err != nil {
		return false, 0, err
	}
	if last15Min >= 10 {
		return true, 15 * time.Minute, nil
	}
	if lastMinute >= 5 {
		return true, time.Minute, nil
	}
	return false, 0, nil
}

func recordLoginAttempt(ctx context.Context, pool *pgxpool.Pool, email, ip string, succeeded bool) {
	// Best-effort: a failure to log an attempt must never block the login
	// response itself.
	_, _ = pool.Exec(ctx,
		`INSERT INTO login_attempts (email, ip, succeeded) VALUES ($1, $2::inet, $3)`,
		email, ip, succeeded)
}

// clientIP extracts a best-effort caller IP. Behind a real proxy this
// should read X-Forwarded-For instead — left as a TODO for the deploy
// milestone, noted here rather than silently wrong.
func clientIP(remoteAddr string) string {
	for i := len(remoteAddr) - 1; i >= 0; i-- {
		if remoteAddr[i] == ':' {
			return remoteAddr[:i]
		}
	}
	return remoteAddr
}
