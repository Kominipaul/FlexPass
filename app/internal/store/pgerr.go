package store

import (
	"errors"

	"github.com/jackc/pgx/v5/pgconn"
)

// isUniqueViolation reports whether err is a Postgres unique_violation
// (SQLSTATE 23505) — used to turn a partial-unique-index conflict (e.g.
// "already booked") into a domain error instead of a raw pg error.
func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
