// Package db owns the Postgres connection pool and a small forward-only
// migration runner. Migration files live in ./migrations, embedded into the
// binary so a deploy is a single artifact with no separate CLI to install.
//
// File format is goose-compatible ("-- +goose Up" / "-- +goose Down")
// so the same files work with the real goose CLI later if the project
// grows into needing its down-migrations, rollback tooling, etc. This
// runner only ever applies Up blocks, in filename order, once each —
// matching the project rule that a shipped migration is never edited.
package db

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed migrations/*.sql
var migrationFS embed.FS

const upMarker = "-- +goose Up"
const downMarker = "-- +goose Down"

// upSQL extracts the statements between "-- +goose Up" and "-- +goose Down".
func upSQL(file string) (string, error) {
	i := strings.Index(file, upMarker)
	if i < 0 {
		return "", fmt.Errorf("missing %q marker", upMarker)
	}
	body := file[i+len(upMarker):]
	if j := strings.Index(body, downMarker); j >= 0 {
		body = body[:j]
	}
	return strings.TrimSpace(body), nil
}

// Migrate applies every migration not yet recorded in schema_migrations, in
// filename order, each inside its own transaction.
func Migrate(ctx context.Context, pool *pgxpool.Pool) error {
	if _, err := pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			filename    text PRIMARY KEY,
			applied_at  timestamptz NOT NULL DEFAULT now()
		)`); err != nil {
		return fmt.Errorf("create schema_migrations: %w", err)
	}

	entries, err := fs.Glob(migrationFS, "migrations/*.sql")
	if err != nil {
		return err
	}
	sort.Strings(entries)

	for _, name := range entries {
		var already bool
		if err := pool.QueryRow(ctx,
			`SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE filename = $1)`,
			name).Scan(&already); err != nil {
			return fmt.Errorf("check %s: %w", name, err)
		}
		if already {
			continue
		}

		raw, err := migrationFS.ReadFile(name)
		if err != nil {
			return err
		}
		stmt, err := upSQL(string(raw))
		if err != nil {
			return fmt.Errorf("%s: %w", name, err)
		}

		tx, err := pool.Begin(ctx)
		if err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, stmt); err != nil {
			tx.Rollback(ctx)
			return fmt.Errorf("apply %s: %w", name, err)
		}
		if _, err := tx.Exec(ctx,
			`INSERT INTO schema_migrations (filename) VALUES ($1)`, name); err != nil {
			tx.Rollback(ctx)
			return fmt.Errorf("record %s: %w", name, err)
		}
		if err := tx.Commit(ctx); err != nil {
			return fmt.Errorf("commit %s: %w", name, err)
		}
		fmt.Printf("migrate: applied %s\n", name)
	}
	return nil
}
