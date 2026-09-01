// Command seed loads reference data (locations, plans, disciplines,
// trainers, announcements — idempotent) and generates a rolling two-week
// class timetable with real timestamps. It never creates users or members:
// those only ever come from real registration.
package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kominipaul/flexpass/app/internal/db"
	"github.com/kominipaul/flexpass/app/internal/db/seed"
)

// classTemplate is one row on the weekly timetable. weekdays uses
// time.Weekday values (0=Sunday .. 6=Saturday).
type classTemplate struct {
	discipline string
	trainerIdx int // index into the trainers list, ordered as seeded
	location   string
	weekdays   []time.Weekday
	clock      string // "HH:MM" local gym time
	minutes    int
	capacity   int
	level      string
}

var timetable = []classTemplate{
	{"functional", 0, "ART", []time.Weekday{1, 3, 5}, "18:00", 45, 18, "all"},
	{"spinning", 2, "ART", []time.Weekday{1, 2, 3, 4, 5}, "19:00", 50, 20, "adv"},
	{"pilates", 3, "PIL", []time.Weekday{1, 2, 3, 4, 5, 6}, "19:15", 55, 8, "all"},
	{"zumba", 5, "ART", []time.Weekday{2, 4}, "20:15", 60, 30, "beginner"},
	{"crossfit", 4, "ART", []time.Weekday{1, 3, 5, 6}, "07:00", 60, 14, "inter"},
	{"trx", 1, "ART", []time.Weekday{2, 4, 6}, "09:30", 45, 12, "all"},
	{"pilates", 3, "PIL", []time.Weekday{1, 3, 5}, "11:00", 55, 8, "inter"},
	{"crossfit", 4, "ART", []time.Weekday{2, 4}, "17:00", 50, 15, "all"},
	{"zumba", 5, "ART", []time.Weekday{6}, "10:00", 60, 30, "all"},
	{"spinning", 2, "ART", []time.Weekday{0}, "10:30", 45, 20, "beginner"},
}

const horizonDays = 14

func main() {
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		log.Fatal("seed: DATABASE_URL is not set")
	}
	ctx := context.Background()

	pool, err := db.NewPool(ctx, url)
	if err != nil {
		log.Fatalf("seed: connect: %v", err)
	}
	defer pool.Close()

	if err := db.Migrate(ctx, pool); err != nil {
		log.Fatalf("seed: migrate: %v", err)
	}
	if _, err := pool.Exec(ctx, seed.ReferenceSQL); err != nil {
		log.Fatalf("seed: reference data: %v", err)
	}
	log.Println("seed: reference data loaded")

	if err := seedClasses(ctx, pool); err != nil {
		log.Fatalf("seed: classes: %v", err)
	}
	log.Println("seed: timetable generated")
}

func seedClasses(ctx context.Context, pool *pgxpool.Pool) error {
	trainerIDs, err := idsInInsertOrder(ctx, pool, "trainers")
	if err != nil {
		return err
	}
	locByCode, err := idsByCode(ctx, pool, "locations")
	if err != nil {
		return err
	}
	discByCode, err := idsByCode(ctx, pool, "disciplines")
	if err != nil {
		return err
	}

	loc, err := time.LoadLocation("Europe/Athens")
	if err != nil {
		loc = time.UTC
	}
	now := time.Now().In(loc)
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, loc)

	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	inserted := 0
	for d := 0; d < horizonDays; d++ {
		day := today.AddDate(0, 0, d)
		for _, tpl := range timetable {
			if !onDay(tpl.weekdays, day.Weekday()) {
				continue
			}
			var hh, mm int
			if _, err := fmt.Sscanf(tpl.clock, "%d:%d", &hh, &mm); err != nil {
				return fmt.Errorf("bad clock %q: %w", tpl.clock, err)
			}
			startsAt := time.Date(day.Year(), day.Month(), day.Day(), hh, mm, 0, 0, loc)
			// Never seed a class that already started — nothing to book.
			if startsAt.Before(now) {
				continue
			}

			var exists bool
			if err := tx.QueryRow(ctx, `
				SELECT EXISTS(
					SELECT 1 FROM classes
					WHERE location_id = $1 AND discipline_id = $2 AND trainer_id = $3 AND starts_at = $4
				)`,
				locByCode[tpl.location], discByCode[tpl.discipline], trainerIDs[tpl.trainerIdx], startsAt,
			).Scan(&exists); err != nil {
				return err
			}
			if exists {
				continue
			}

			if _, err := tx.Exec(ctx, `
				INSERT INTO classes (location_id, discipline_id, trainer_id, starts_at, duration_min, capacity, level)
				VALUES ($1, $2, $3, $4, $5, $6, $7)`,
				locByCode[tpl.location], discByCode[tpl.discipline], trainerIDs[tpl.trainerIdx],
				startsAt, tpl.minutes, tpl.capacity, tpl.level,
			); err != nil {
				return err
			}
			inserted++
		}
	}
	log.Printf("seed: inserted %d class instances over the next %d days", inserted, horizonDays)
	return tx.Commit(ctx)
}

func onDay(days []time.Weekday, d time.Weekday) bool {
	for _, w := range days {
		if w == d {
			return true
		}
	}
	return false
}

func idsByCode(ctx context.Context, pool *pgxpool.Pool, table string) (map[string]string, error) {
	rows, err := pool.Query(ctx, "SELECT code, id FROM "+table)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]string{}
	for rows.Next() {
		var code, id string
		if err := rows.Scan(&code, &id); err != nil {
			return nil, err
		}
		out[code] = id
	}
	return out, rows.Err()
}

// idsInInsertOrder returns trainer IDs ordered by created_at, matching the
// order they appear in reference.sql, so classTemplate.trainerIdx lines up.
func idsInInsertOrder(ctx context.Context, pool *pgxpool.Pool, table string) ([]string, error) {
	rows, err := pool.Query(ctx, "SELECT id FROM "+table+" ORDER BY created_at, id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		out = append(out, id)
	}
	return out, rows.Err()
}
