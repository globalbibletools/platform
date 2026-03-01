#!/bin/bash
#
# Regenerate test seed dumps from the live dev database.
# Run this after Bible corpus data changes (rare).
#
# Usage: ./db/scripts/generate_test_seeds.sh
#
set -e

echo "Generating test_seed_full.dump..."
docker compose exec db pg_dump -Fc --data-only -U postgres \
  --table=public.book \
  --table=public.verse \
  --table=public.word \
  --table=public.lemma \
  --table=public.lemma_form \
  --table=public.lemma_form_suggestion \
  -f /tmp/test_seed_full.dump
docker compose cp db:/tmp/test_seed_full.dump ./db/scripts/test_seed_full.dump
echo "  -> db/scripts/test_seed_full.dump"

echo "Generating test_seed_minimal.dump..."
docker compose exec db psql -U postgres -c "DROP DATABASE IF EXISTS seed_build"
docker compose exec db psql -U postgres -c "CREATE DATABASE seed_build"

# Populate with just books, Gen 1:1-5 (OT) and John 1:1-5 (NT), plus their words/lemmas
docker compose exec db bash -c "
  psql -U postgres -d seed_build -c \"
    CREATE TABLE public.book (id integer NOT NULL, name text NOT NULL);
    CREATE TABLE public.lemma (id text NOT NULL);
    CREATE TABLE public.lemma_form (id text NOT NULL, grammar text NOT NULL, lemma_id text NOT NULL);
    CREATE TABLE public.verse (id text NOT NULL, number integer NOT NULL, book_id integer NOT NULL, chapter integer NOT NULL);
    CREATE TABLE public.word (id text NOT NULL, text text NOT NULL, verse_id text NOT NULL, form_id text NOT NULL);
  \"

  psql -U postgres -c \"COPY public.book TO STDOUT\" \
    | psql -U postgres -d seed_build -c \"COPY public.book FROM STDIN\"

  psql -U postgres -c \"COPY (SELECT * FROM verse WHERE (book_id=1 AND chapter=1 AND number<=5) OR (book_id=43 AND chapter=1 AND number<=5)) TO STDOUT\" \
    | psql -U postgres -d seed_build -c \"COPY public.verse FROM STDIN\"

  psql -U postgres -c \"COPY (SELECT w.* FROM word w JOIN verse v ON v.id = w.verse_id WHERE (v.book_id=1 AND v.chapter=1 AND v.number<=5) OR (v.book_id=43 AND v.chapter=1 AND v.number<=5)) TO STDOUT\" \
    | psql -U postgres -d seed_build -c \"COPY public.word FROM STDIN\"

  psql -U postgres -c \"COPY (SELECT DISTINCT lf.* FROM lemma_form lf WHERE lf.id IN (SELECT DISTINCT form_id FROM word WHERE verse_id IN (SELECT id FROM verse WHERE (book_id=1 AND chapter=1 AND number<=5) OR (book_id=43 AND chapter=1 AND number<=5)))) TO STDOUT\" \
    | psql -U postgres -d seed_build -c \"COPY public.lemma_form FROM STDIN\"

  psql -U postgres -c \"COPY (SELECT DISTINCT l.* FROM lemma l WHERE l.id IN (SELECT DISTINCT lemma_id FROM lemma_form WHERE id IN (SELECT DISTINCT form_id FROM word WHERE verse_id IN (SELECT id FROM verse WHERE (book_id=1 AND chapter=1 AND number<=5) OR (book_id=43 AND chapter=1 AND number<=5))))) TO STDOUT\" \
    | psql -U postgres -d seed_build -c \"COPY public.lemma FROM STDIN\"
"

docker compose exec db pg_dump -Fc --data-only -U postgres -d seed_build -f /tmp/test_seed_minimal.dump
docker compose cp db:/tmp/test_seed_minimal.dump ./db/scripts/test_seed_minimal.dump
docker compose exec db psql -U postgres -c "DROP DATABASE IF EXISTS seed_build"
echo "  -> db/scripts/test_seed_minimal.dump"

echo "Done."
