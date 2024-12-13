CREATE TABLE gloss_history (
    id SERIAL PRIMARY KEY,
    phrase_id INT NOT NULL REFERENCES "Phrase" (id),
    gloss TEXT,
    state "GlossState",
    source "GlossSource",
    updated_at TIMESTAMP NOT NULL,
    updated_by UUID
);

CREATE OR REPLACE FUNCTION gloss_audit()
RETURNS TRIGGER AS
$$
BEGIN
    INSERT INTO gloss_history AS c (phrase_id, gloss, state, source, updated_at, updated_by)
    VALUES (OLD."phraseId", OLD.gloss, OLD.state, OLD.source, OLD.updated_at, OLD.updated_by);

    RETURN NULL;
END;
$$
LANGUAGE 'plpgsql';

CREATE TRIGGER gloss_audit
AFTER UPDATE OR DELETE
ON "Gloss"
FOR EACH ROW 
EXECUTE FUNCTION gloss_audit();

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
