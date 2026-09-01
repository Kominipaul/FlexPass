// Command migrate applies pending SQL migrations and exits. Run it before
// starting the API, or on every boot in dev — it is idempotent.
package main

import (
	"context"
	"log"
	"os"

	"github.com/kominipaul/flexpass/app/internal/db"
)

func main() {
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		log.Fatal("migrate: DATABASE_URL is not set")
	}
	ctx := context.Background()
	pool, err := db.NewPool(ctx, url)
	if err != nil {
		log.Fatalf("migrate: connect: %v", err)
	}
	defer pool.Close()

	if err := db.Migrate(ctx, pool); err != nil {
		log.Fatalf("migrate: %v", err)
	}
	log.Println("migrate: up to date")
}
