BEGIN;

CREATE TABLE "LemmaFormSuggestions" (
    "languageId" UUID NOT NULL REFERENCES "Language" (id),
    "formId" TEXT NOT NULL REFERENCES "LemmaForm" (id),
    "suggestions" TEXT[] NOT NULL,
    PRIMARY KEY ("languageId", "formId")
);

INSERT INTO "LemmaFormSuggestions" ("languageId", "formId", "suggestions")
SELECT "languageId", "formId", ARRAY_AGG(gloss ORDER BY count DESC)
FROM (
    SELECT ph."languageId", w."formId", g.gloss, COUNT(*) AS count FROM "Phrase" AS ph
    JOIN "PhraseWord" AS phw ON phw."phraseId" = ph.id
    JOIN "Word" AS w ON w.id = phw."wordId"
    JOIN "Gloss" AS g ON g."phraseId" = ph.id
    WHERE ph."deletedAt" IS NULL
        AND g.state = 'APPROVED'
    GROUP BY ph."languageId", w."formId", g.gloss
) gloss
GROUP BY "languageId", "formId";

CREATE OR REPLACE FUNCTION compute_suggestions()
RETURNS TRIGGER AS
$$
BEGIN
    WITH language AS (
        SELECT "languageId" AS id FROM "Phrase"
        WHERE id = NEW."phraseId"
    )
    INSERT INTO "LemmaFormSuggestions" ("languageId", "formId", "suggestions")
    SELECT
        (SELECT id FROM language),
        id,
        ARRAY_AGG(gloss ORDER BY count DESC)
    FROM (
        SELECT form.id, g.gloss, COUNT(*) AS count FROM (
            SELECT DISTINCT w."formId" AS id FROM "Phrase" AS ph
            JOIN "PhraseWord" AS phw ON phw."phraseId" = ph.id
            JOIN "Word" AS w ON w.id = phw."wordId"
            WHERE ph.id = NEW."phraseId"
        ) AS form
        JOIN "Word" AS w ON w."formId" = form.id
        JOIN "PhraseWord" AS phw ON phw."wordId" = w.id
        JOIN "Phrase" AS ph ON ph.id = phw."phraseId"
        JOIN "Gloss" AS g ON g."phraseId" = ph.id
        WHERE ph."deletedAt" IS NULL
            AND ph."languageId" = (SELECT id FROM language)
            AND g.state = 'APPROVED'
        GROUP BY form.id, g.gloss
    ) AS form_gloss
    GROUP BY id
    ON CONFLICT ("languageId", "formId")
    DO UPDATE SET "suggestions" = EXCLUDED.suggestions;

    RETURN NULL;
END;
$$
LANGUAGE 'plpgsql';

CREATE TRIGGER compute_suggestions_trigger
AFTER INSERT OR UPDATE OF gloss, state
ON "Gloss"
FOR EACH ROW 
EXECUTE FUNCTION compute_suggestions();

COMMIT;
