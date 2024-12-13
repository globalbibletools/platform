CREATE TABLE gloss_history (
    id SERIAL PRIMARY KEY,
    phrase_id INT NOT NULL REFERENCES "Phrase" (id),
    gloss TEXT,
    state "GlossState",
    source "GlossSource" NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    updated_by UUID
);

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
