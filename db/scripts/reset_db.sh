#!/bin/bash
# Drops and recreates the development database, then restores it from seed files.
# Run from the repo root: bash db/scripts/reset_db.sh

set -euo pipefail

DB_SERVICE="db"
DB_USER="postgres"
DB_NAME="postgres"

echo "Dropping database '$DB_NAME'..."
docker compose exec "$DB_SERVICE" \
  psql --username "$DB_USER" --dbname template1 \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();"

docker compose exec "$DB_SERVICE" \
  psql --dbname template1 \
  -c "DROP DATABASE IF EXISTS \"$DB_NAME\";"

echo "Creating database '$DB_NAME'..."
docker compose exec "$DB_SERVICE" \
  psql --dbname template1 \
  -c "CREATE DATABASE \"$DB_NAME\";"

echo "Initialising database..."
docker compose exec \
  -e POSTGRES_DB="$DB_NAME" \
  "$DB_SERVICE" \
  bash /db/scripts/init_db.sh

echo "Done. Database '$DB_NAME' has been reset."
