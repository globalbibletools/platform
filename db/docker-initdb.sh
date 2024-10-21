#!/bin/bash

echo "shared_preload_libraries = 'pg_cron'" >> /var/lib/postgresql/data/postgresql.conf

psql --dbname "$POSTGRES_DB" --username "$POSTGRES_USER" -f /db/schema.sql;
pg_restore -Fc --dbname "$POSTGRES_DB" --username "$POSTGRES_USER" /db/data.dump;
