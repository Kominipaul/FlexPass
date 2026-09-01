.PHONY: dev-db migrate seed run test test-integration web build

# Starts Postgres locally without Docker (this sandbox has no docker
# daemon — see README "Two ways to run this"). If you have Docker, use
# `docker compose up db` instead and skip this target.
dev-db:
	service postgresql start
	@psql -U postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='powerlife'" | grep -q 1 || \
		psql -U postgres -c "CREATE ROLE powerlife LOGIN PASSWORD 'powerlife_dev_pw';"
	@psql -U postgres -lqt | cut -d'|' -f1 | grep -qw powerlife || \
		psql -U postgres -c "CREATE DATABASE powerlife OWNER powerlife;"
	psql -U postgres -d powerlife -c "CREATE EXTENSION IF NOT EXISTS pgcrypto; CREATE EXTENSION IF NOT EXISTS citext;"

migrate:
	go run ./cmd/migrate

seed:
	go run ./cmd/seed

run:
	go run ./cmd/api

test:
	go test ./...

# Needs DATABASE_URL pointed at a real Postgres (dev-db + migrate + seed
# first) — exercises the booking-concurrency guarantee for real.
test-integration:
	go test ./... -race -v -run 'Concurrent|Promotes'

web:
	cd web && npm run dev -- --port 5173

build:
	go build ./...
	cd web && npm run build
