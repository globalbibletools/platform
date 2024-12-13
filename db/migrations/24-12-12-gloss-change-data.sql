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

ALTER TABLE "Gloss"
    ALTER COLUMN updated_at DROP NOT NULL;
