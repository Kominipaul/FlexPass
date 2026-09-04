#!/usr/bin/env bash
# A project-local PostgreSQL instance.
#
# Runs entirely as your own user — no sudo, no system service, no interference
# with a Postgres you may already have on 5432. The cluster lives in
# server/.pgdata (gitignored) and listens on 55432.
#
# If you'd rather use a system Postgres, skip this entirely and point
# DATABASE_URL in server/.env at it.
set -euo pipefail

PGBIN=${PGBIN:-/usr/lib/postgresql/14/bin}
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PGDATA="$HERE/.pgdata"
PGPORT=${PGPORT:-55432}
PGUSER_NAME=flexpass
PGDB=flexpass

if [ ! -x "$PGBIN/pg_ctl" ]; then
  echo "Postgres binaries not found at $PGBIN" >&2
  echo "Set PGBIN, e.g. PGBIN=/usr/lib/postgresql/16/bin $0 $*" >&2
  exit 1
fi

# Unix sockets are disabled: the absolute socket path in some checkouts
# exceeds the 107-byte limit Postgres enforces. TCP on localhost only.
start_opts="-p $PGPORT -c unix_socket_directories='' -c listen_addresses=127.0.0.1"

case "${1:-start}" in
  start)
    if [ ! -d "$PGDATA" ]; then
      echo "Initialising cluster in $PGDATA ..."
      "$PGBIN/initdb" -D "$PGDATA" -U "$PGUSER_NAME" --auth=trust >/dev/null
    fi
    if "$PGBIN/pg_ctl" -D "$PGDATA" status >/dev/null 2>&1; then
      echo "Already running on port $PGPORT."
    else
      "$PGBIN/pg_ctl" -D "$PGDATA" -o "$start_opts" -l "$PGDATA/server.log" start >/dev/null
      sleep 1
      echo "Started on port $PGPORT."
    fi
    "$PGBIN/psql" -h 127.0.0.1 -p "$PGPORT" -U "$PGUSER_NAME" -d postgres -tAc \
      "SELECT 1 FROM pg_database WHERE datname='$PGDB'" | grep -q 1 \
      || "$PGBIN/psql" -h 127.0.0.1 -p "$PGPORT" -U "$PGUSER_NAME" -d postgres -c \
           "CREATE DATABASE $PGDB OWNER $PGUSER_NAME" >/dev/null
    echo "Ready: postgres://$PGUSER_NAME@127.0.0.1:$PGPORT/$PGDB"
    ;;
  stop)
    "$PGBIN/pg_ctl" -D "$PGDATA" stop -m fast >/dev/null 2>&1 && echo "Stopped." || echo "Not running."
    ;;
  status)
    "$PGBIN/pg_ctl" -D "$PGDATA" status || true
    ;;
  destroy)
    "$PGBIN/pg_ctl" -D "$PGDATA" stop -m fast >/dev/null 2>&1 || true
    rm -rf "$PGDATA"
    echo "Cluster deleted."
    ;;
  *)
    echo "usage: $0 {start|stop|status|destroy}" >&2; exit 1 ;;
esac
