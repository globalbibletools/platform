BEGIN;

ALTER TABLE "Gloss"
    ADD COLUMN source "GlossSource",
    ADD COLUMN updated_at TIMESTAMP,
    ADD COLUMN updated_by UUID REFERENCES "User" (id);

UPDATE "Gloss" g SET
    source = upd.source,
    updated_by = upd."userId",
    updated_at = upd.timestamp
FROM (
    SELECT DISTINCT ON ("phraseId") * FROM "GlossEvent"
    ORDER BY "phraseId", "timestamp" DESC
) upd
WHERE upd."phraseId" = g."phraseId";

UPDATE "Gloss" g SET
    updated_at = upd."createdAt",
    updated_by = upd."createdBy"
FROM (
    SELECT * FROM "Phrase"
) upd
WHERE upd.id = g."phraseId"
    AND g.updated_at is NULL;

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

COMMIT;
