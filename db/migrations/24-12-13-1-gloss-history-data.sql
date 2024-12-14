-- TODO: an option to get events for glosses that changed after the initial save
WITH event_count AS (
    SELECT
        "phraseId" AS phrase_id,
        COUNT(*) AS count
    FROM "GlossEvent"
    GROUP BY "phraseId"
    HAVING COUNT(*) > 1
)
SELECT gloss.*, event.* FROM (
    SELECT DISTINCT ON (event_count.phrase_id) event.* FROM event_count
    JOIN "GlossEvent" event ON event."phraseId" = event_count.phrase_id
    ORDER BY event_count.phrase_id, event.id DESC
) event
JOIN "Gloss" gloss ON gloss."phraseId" = event."phraseId"
    WHERE gloss.state <> event.state OR gloss.gloss <> event.gloss;

INSERT INTO gloss_history (phrase_id, gloss, state, source, updated_at, updated_by)
SELECT "phraseId", gloss, state, source, timestamp, "userId" FROM "GlossEvent"
WHERE state IS NOT NULL OR gloss IS NOT NULL;

DO $$
DECLARE entry RECORD;
BEGIN
    FOR entry IN (
        SELECT * FROM gloss_history
        WHERE state IS NULL
        ORDER BY updated_at
    )
    LOOP
        UPDATE gloss_history
            SET state = (
                SELECT state FROM gloss_history h
                WHERE h.phrase_id = entry.phrase_id
                    AND h.updated_at < entry.updated_at
                ORDER BY h.updated_at DESC
                LIMIT 1
            )
        WHERE id = entry.id;
    END LOOP;
END; $$;

DO $$
DECLARE entry RECORD;
BEGIN
    FOR entry IN (
        SELECT * FROM gloss_history
        WHERE gloss IS NULL
        ORDER BY updated_at
    )
    LOOP
        UPDATE gloss_history
            SET gloss = (
                SELECT gloss FROM gloss_history h
                WHERE h.phrase_id = entry.phrase_id
                    AND h.updated_at < entry.updated_at
                ORDER BY h.updated_at DESC
                LIMIT 1
            )
        WHERE id = entry.id;
    END LOOP;
END; $$;
