docker compose exec db pg_dump --no-owner --schema=public --schema-only > db/scripts/schema.sql
docker compose exec db pg_dump -Fc --data-only > db/scripts/data.dump

