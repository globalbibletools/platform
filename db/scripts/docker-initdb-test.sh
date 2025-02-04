#!/bin/bash

psql --dbname "$POSTGRES_DB" --username "$POSTGRES_USER" -f /db/scripts/init_extensions.sql

