#!/bin/bash
# Creates a new data.dump seed from the prod-clone database.
#
# Pulls data for English, Spanish, Portuguese, and Hindi only, anonymizes all
# users (replacing real names and emails with generated ones), and injects the
# platform admin user from the existing dev seed.
#
# Must be run from inside the db container. Invoke from the repo root with:
#   docker compose exec db bash /db/scripts/create_seed_from_prod_clone.sh

set -euo pipefail

SOURCE_DB="prod-clone"
STAGING_DB="seed_staging"
OUTPUT_FILE="/db/scripts/data.dump"

# -----------------------------------------------------------------------------
# Platform admin from the existing dev seed — preserved exactly as-is.
# Credentials: platform_admin@example.com / (existing hashed password)
# -----------------------------------------------------------------------------
PLATFORM_ADMIN_ID="018bba70-9889-b622-6700-d7bd5e750bb6"
PLATFORM_ADMIN_NAME="Platform Admin"
PLATFORM_ADMIN_EMAIL="platform_admin@example.com"
PLATFORM_ADMIN_HASH="D6CgDdCE9kB7qLLu:19c04c5f479c1af6772c8cb4efe106ef3f8353d05b74145b4f7a1c903a7b87f6fe74a492ad8c445f326c4f968bb6f1166056b37d28e527621fa1d0b40edd9f31"

echo "==> [1/9] Creating staging database '$STAGING_DB'..."
psql -U postgres -d template1 -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname = '$STAGING_DB' AND pid <> pg_backend_pid();
"
psql -U postgres -d template1 -c "DROP DATABASE IF EXISTS \"$STAGING_DB\";"
psql -U postgres -d template1 -c "CREATE DATABASE \"$STAGING_DB\";"

echo "==> [2/9] Applying current schema to staging database..."
psql -U postgres -d "$STAGING_DB" -f /db/scripts/init_extensions.sql
psql -U postgres -d "$STAGING_DB" -c "CREATE EXTENSION IF NOT EXISTS dblink;"
psql -U postgres -d "$STAGING_DB" -f /db/scripts/schema.sql

echo "==> [3/9] Copying Bible reference data from '$SOURCE_DB'..."
psql -U postgres -d "$STAGING_DB" <<SQL
-- Disable triggers while bulk-loading to avoid side effects
SET session_replication_role = replica;

INSERT INTO book
  SELECT * FROM dblink('dbname=$SOURCE_DB user=postgres', '
    SELECT id, name FROM book
  ') AS t(id int, name text)
  ON CONFLICT DO NOTHING;

INSERT INTO lemma
  SELECT * FROM dblink('dbname=$SOURCE_DB user=postgres', '
    SELECT id FROM lemma
  ') AS t(id text)
  ON CONFLICT DO NOTHING;

INSERT INTO lemma_form
  SELECT * FROM dblink('dbname=$SOURCE_DB user=postgres', '
    SELECT id, grammar, lemma_id FROM lemma_form
  ') AS t(id text, grammar text, lemma_id text)
  ON CONFLICT DO NOTHING;

INSERT INTO lemma_resource
  SELECT * FROM dblink('dbname=$SOURCE_DB user=postgres', '
    SELECT lemma_id, resource_code, content FROM lemma_resource
  ') AS t(lemma_id text, resource_code resource_code, content text)
  ON CONFLICT DO NOTHING;

INSERT INTO verse
  SELECT * FROM dblink('dbname=$SOURCE_DB user=postgres', '
    SELECT id, number, book_id, chapter FROM verse
  ') AS t(id text, number int, book_id int, chapter int)
  ON CONFLICT DO NOTHING;

INSERT INTO word
  SELECT * FROM dblink('dbname=$SOURCE_DB user=postgres', '
    SELECT id, text, verse_id, form_id FROM word
  ') AS t(id text, text text, verse_id text, form_id text)
  ON CONFLICT DO NOTHING;

INSERT INTO word_lexicon
  SELECT * FROM dblink('dbname=$SOURCE_DB user=postgres', '
    SELECT word_id, content FROM word_lexicon
  ') AS t(word_id text, content text)
  ON CONFLICT DO NOTHING;

INSERT INTO recording
  SELECT * FROM dblink('dbname=$SOURCE_DB user=postgres', '
    SELECT id, name FROM recording
  ') AS t(id text, name text)
  ON CONFLICT DO NOTHING;

INSERT INTO verse_audio_timing
  SELECT * FROM dblink('dbname=$SOURCE_DB user=postgres', '
    SELECT id, verse_id, recording_id, start, "end" FROM verse_audio_timing
  ') AS t(id int, verse_id text, recording_id text, start float8, "end" float8)
  ON CONFLICT DO NOTHING;

INSERT INTO verse_commentary
  SELECT * FROM dblink('dbname=$SOURCE_DB user=postgres', '
    SELECT verse_id, content FROM verse_commentary
  ') AS t(verse_id text, content text)
  ON CONFLICT DO NOTHING;

INSERT INTO verse_question
  SELECT * FROM dblink('dbname=$SOURCE_DB user=postgres', '
    SELECT verse_id, sort_order, question, response FROM verse_question
  ') AS t(verse_id text, sort_order int, question text, response text)
  ON CONFLICT DO NOTHING;

SET session_replication_role = DEFAULT;
SQL

echo "==> [4/9] Copying target languages (eng, spa, hin) from '$SOURCE_DB'..."
psql -U postgres -d "$STAGING_DB" <<SQL
SET session_replication_role = replica;

INSERT INTO language
  SELECT * FROM dblink('dbname=$SOURCE_DB user=postgres', '
    SELECT
      id, code, english_name, font, translation_ids, text_direction,
      reference_language_id, local_name, machine_gloss_strategy
    FROM language
    WHERE code IN (''eng'', ''spa'', ''hin'')
  ') AS t(
    id uuid, code text, english_name text, font text,
    translation_ids text[], text_direction text_direction,
    reference_language_id uuid, local_name text, machine_gloss_strategy text
  )
  ON CONFLICT DO NOTHING;

SET session_replication_role = DEFAULT;
SQL

echo "==> [5/9] Copying translation data for target languages..."
psql -U postgres -d "$STAGING_DB" <<SQL
SET session_replication_role = replica;

-- phrase
INSERT INTO phrase
  SELECT * FROM dblink('dbname=$SOURCE_DB user=postgres', '
    SELECT id, language_id, created_at, created_by, deleted_at, deleted_by
    FROM phrase
    WHERE language_id IN (SELECT id FROM language WHERE code IN (''eng'', ''spa'', ''hin''))
  ') AS t(
    id int, language_id uuid, created_at timestamptz, created_by uuid,
    deleted_at timestamptz, deleted_by uuid
  )
  ON CONFLICT DO NOTHING;

-- phrase_word
INSERT INTO phrase_word
  SELECT * FROM dblink('dbname=$SOURCE_DB user=postgres', '
    SELECT pw.phrase_id, pw.word_id
    FROM phrase_word pw
    JOIN phrase p ON p.id = pw.phrase_id
    WHERE p.language_id IN (SELECT id FROM language WHERE code IN (''eng'', ''spa'', ''hin''))
  ') AS t(phrase_id int, word_id text)
  ON CONFLICT DO NOTHING;

-- gloss
INSERT INTO gloss
  SELECT * FROM dblink('dbname=$SOURCE_DB user=postgres', '
    SELECT g.gloss, g.state, g.phrase_id, g.source, g.updated_at, g.updated_by
    FROM gloss g
    JOIN phrase p ON p.id = g.phrase_id
    WHERE p.language_id IN (SELECT id FROM language WHERE code IN (''eng'', ''spa'', ''hin''))
  ') AS t(
    gloss text, state gloss_state, phrase_id int, source gloss_source,
    updated_at timestamptz, updated_by uuid
  )
  ON CONFLICT DO NOTHING;

-- gloss_history
INSERT INTO gloss_history
  SELECT * FROM dblink('dbname=$SOURCE_DB user=postgres', '
    SELECT gh.id, gh.phrase_id, gh.gloss, gh.state, gh.source, gh.updated_at, gh.updated_by
    FROM gloss_history gh
    JOIN phrase p ON p.id = gh.phrase_id
    WHERE p.language_id IN (SELECT id FROM language WHERE code IN (''eng'', ''spa'', ''hin''))
  ') AS t(
    id int, phrase_id int, gloss text, state gloss_state, source gloss_source,
    updated_at timestamptz, updated_by uuid
  )
  ON CONFLICT DO NOTHING;

-- gloss_event (has language_id directly)
INSERT INTO gloss_event
  SELECT * FROM dblink('dbname=$SOURCE_DB user=postgres', '
    SELECT id, phrase_id, language_id, user_id, timestamp,
           prev_gloss, prev_state, new_gloss, new_state, approval_method,
           word_id
    FROM gloss_event
    WHERE language_id IN (SELECT id FROM language WHERE code IN (''eng'', ''spa'', ''hin''))
  ') AS t(
    id uuid, phrase_id int, language_id uuid, user_id uuid,
    timestamp timestamptz, prev_gloss text, prev_state text, new_gloss text,
    new_state text, approval_method text, word_id text
  )
  ON CONFLICT DO NOTHING;

-- machine_gloss
INSERT INTO machine_gloss
  SELECT * FROM dblink('dbname=$SOURCE_DB user=postgres', '
    SELECT word_id, language_id, gloss, id
    FROM machine_gloss
    WHERE language_id IN (SELECT id FROM language WHERE code IN (''eng'', ''spa'', ''hin''))
  ') AS t(word_id text, language_id uuid, gloss text, id int)
  ON CONFLICT DO NOTHING;

-- lemma_form_suggestion
INSERT INTO lemma_form_suggestion
  SELECT * FROM dblink('dbname=$SOURCE_DB user=postgres', '
    SELECT id, language_id, form_id, gloss, count
    FROM lemma_form_suggestion
    WHERE language_id IN (SELECT id FROM language WHERE code IN (''eng'', ''spa'', ''hin''))
  ') AS t(id int, language_id uuid, form_id text, gloss text, count int)
  ON CONFLICT DO NOTHING;

-- translator_note
INSERT INTO translator_note
  SELECT * FROM dblink('dbname=$SOURCE_DB user=postgres', '
    SELECT tn.author_id, tn.timestamp, tn.content, tn.phrase_id 
    FROM translator_note tn
    JOIN phrase p ON p.id = tn.phrase_id
    WHERE p.language_id IN (SELECT id FROM language WHERE code IN (''eng'', ''spa'', ''hin''))
  ') AS t(author_id uuid, timestamp timestamptz, content text, phrase_id int)
  ON CONFLICT DO NOTHING;

-- footnote
INSERT INTO footnote
  SELECT * FROM dblink('dbname=$SOURCE_DB user=postgres', '
    SELECT tn.author_id, tn.timestamp, tn.content, tn.phrase_id
    FROM footnote fn
    JOIN phrase p ON p.id = fn.phrase_id
    WHERE p.language_id IN (SELECT id FROM language WHERE code IN (''eng'', ''spa'', ''hin''))
  ') AS t(author_id uuid, timestamp timestamptz, content text, phrase_id int)
  ON CONFLICT DO NOTHING;

-- weekly_gloss_statistics
INSERT INTO weekly_gloss_statistics
  SELECT * FROM dblink('dbname=$SOURCE_DB user=postgres', '
    SELECT id, week, language_id, book_id, user_id, approved_count, unapproved_count
    FROM weekly_gloss_statistics
    WHERE language_id IN (SELECT id FROM language WHERE code IN (''eng'', ''spa'', ''hin''))
  ') AS t(
    id int, week timestamptz, language_id uuid, book_id int, user_id uuid,
    approved_count int, unapproved_count int
  )
  ON CONFLICT DO NOTHING;

-- weekly_contribution_statistics
INSERT INTO weekly_contribution_statistics
  SELECT * FROM dblink('dbname=$SOURCE_DB user=postgres', '
    SELECT id, week, language_id, user_id, approved_count, revoked_count,
           edited_approved_count, edited_unapproved_count
    FROM weekly_contribution_statistics
    WHERE language_id IN (SELECT id FROM language WHERE code IN (''eng'', ''spa'', ''hin''))
  ') AS t(
    id int, week timestamptz, language_id uuid, user_id uuid,
    approved_count int, revoked_count int,
    edited_approved_count int, edited_unapproved_count int
  )
  ON CONFLICT DO NOTHING;

SET session_replication_role = DEFAULT;
SQL

echo "==> [6/9] Copying users who are members of target languages..."
psql -U postgres -d "$STAGING_DB" <<SQL
SET session_replication_role = replica;

-- Copy users who are members of at least one target language.
-- Exclude the platform admin ID — they will be injected separately in step 8.
INSERT INTO users
  SELECT * FROM dblink('dbname=$SOURCE_DB user=postgres', '
    SELECT DISTINCT u.id, u.name, u.email_status, u.email, u.hashed_password, u.status
    FROM users u
    JOIN language_member lm ON lm.user_id = u.id
    JOIN language l ON l.id = lm.language_id
    WHERE l.code IN (''eng'', ''spa'', ''hin'')
      AND u.id != ''$PLATFORM_ADMIN_ID''::uuid
  ') AS t(
    id uuid, name text, email_status email_status, email text, hashed_password text,
    status user_status
  )
  ON CONFLICT DO NOTHING;

-- language_member (target languages only)
INSERT INTO language_member
  SELECT * FROM dblink('dbname=$SOURCE_DB user=postgres', '
    SELECT lm.language_id, lm.user_id, lm.invited_at
    FROM language_member lm
    JOIN language l ON l.id = lm.language_id
    WHERE l.code IN (''eng'', ''spa'', ''hin'')
  ') AS t(language_id uuid, user_id uuid, invited_at timestamptz)
  ON CONFLICT DO NOTHING;

SET session_replication_role = DEFAULT;
SQL

echo "==> [7/9] Anonymizing users..."
psql -U postgres -d "$STAGING_DB" <<SQL
-- Assign each user a sequential number and replace their name/email.
-- The platform admin is not present yet so no exclusion is needed here.
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS n
  FROM users
)
UPDATE users u
SET
  name  = 'User ' || n.n,
  email = 'user_' || n.n || '@example.com'
FROM numbered n
WHERE u.id = n.id;
SQL

echo "==> [8/9] Injecting platform admin user from existing dev seed..."
psql -U postgres -d "$STAGING_DB" <<SQL
SET session_replication_role = replica;

INSERT INTO users (id, name, email, hashed_password, email_status, status)
VALUES (
  '$PLATFORM_ADMIN_ID',
  '$PLATFORM_ADMIN_NAME',
  '$PLATFORM_ADMIN_EMAIL',
  '$PLATFORM_ADMIN_HASH',
  'VERIFIED',
  'active'
)
ON CONFLICT (id) DO UPDATE SET
  name            = EXCLUDED.name,
  email           = EXCLUDED.email,
  hashed_password = EXCLUDED.hashed_password,
  email_status    = EXCLUDED.email_status,
  status          = EXCLUDED.status;

INSERT INTO user_system_role (user_id, role)
VALUES ('$PLATFORM_ADMIN_ID', 'ADMIN')
ON CONFLICT DO NOTHING;

SET session_replication_role = DEFAULT;
SQL

echo "==> [9/9] Refreshing materialized views and dumping to $OUTPUT_FILE..."
psql -U postgres -d "$STAGING_DB" -f /db/scripts/refresh_views.sql

pg_dump \
  -U postgres \
  -Fc \
  --data-only \
  --no-owner \
  --schema=public \
  -d "$STAGING_DB" \
  > "$OUTPUT_FILE"

echo "==> Cleaning up staging database..."
psql -U postgres -d template1 -c "DROP DATABASE IF EXISTS \"$STAGING_DB\";"

echo ""
echo "Done. New seed written to $OUTPUT_FILE"
echo "Run 'bash db/scripts/reset_db.sh' to apply it to the dev database."
