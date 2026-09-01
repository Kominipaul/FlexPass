package store

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type Invoice struct {
	Number      string
	IssuedOn    time.Time
	DescEl      string
	DescEn      string
	AmountCents int
	Status      string
	Method      string
}

// CreateInvoice allocates the next number from invoice_number_seq (formatted
// "ΑΠΥ-<n>", matching the prototype's Greek receipt series) and writes the
// row. Runs on the given querier so it can join the caller's transaction
// (e.g. a plan change that must not record a fee without also changing the
// plan) or the plain pool when called standalone.
func (s *Store) CreateInvoice(ctx context.Context, q querier, memberID, descEl, descEn string, amountCents int, status, method string) (string, error) {
	var number string
	err := q.QueryRow(ctx,
		`SELECT 'ΑΠΥ-' || nextval('invoice_number_seq')`,
	).Scan(&number)
	if err != nil {
		return "", fmt.Errorf("allocate invoice number: %w", err)
	}
	_, err = q.Exec(ctx, `
		INSERT INTO invoices (member_id, number, description_el, description_en, total_cents, status, payment_method)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, memberID, number, descEl, descEn, amountCents, status, method)
	return number, err
}

func (s *Store) ListInvoices(ctx context.Context, memberID string) ([]Invoice, error) {
	rows, err := s.Pool.Query(ctx, `
		SELECT number, issued_on, description_el, description_en, total_cents, status, COALESCE(payment_method, '')
		FROM invoices WHERE member_id = $1 ORDER BY issued_on DESC, created_at DESC
	`, memberID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Invoice
	for rows.Next() {
		var inv Invoice
		if err := rows.Scan(&inv.Number, &inv.IssuedOn, &inv.DescEl, &inv.DescEn, &inv.AmountCents, &inv.Status, &inv.Method); err != nil {
			return nil, err
		}
		out = append(out, inv)
	}
	return out, rows.Err()
}

// querier is satisfied by both *pgxpool.Pool and pgx.Tx — CreateInvoice
// runs identically whether it's the only write happening or one line
// inside a larger transaction.
type querier interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}
