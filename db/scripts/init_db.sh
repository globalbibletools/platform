#!/bin/bash
# Initialises (or re-initialises) the development database.
# Intended to be run inside the db container where POSTGRES_DB is set
# (either directly or via `docker compose exec db`).

set -euo pipefail

psql --dbname "$POSTGRES_DB" -f /db/scripts/init_extensions.sql
psql --dbname "$POSTGRES_DB" -f /db/scripts/schema.sql
pg_restore -Fc --disable-triggers --dbname "$POSTGRES_DB" /db/scripts/data.dump
psql --dbname "$POSTGRES_DB" -f /db/scripts/refresh_views.sql
