BEGIN;

DROP TRIGGER compute_suggestions_trigger ON "Gloss";
DROP FUNCTION compute_suggestions();
DROP TABLE "LemmaFormSuggestions";

CREATE TABLE "LemmaFormSuggestionCount" (
    id SERIAL PRIMARY KEY,
    "languageId" UUID NOT NULL REFERENCES "Language" (id),
    "formId" TEXT NOT NULL REFERENCES "LemmaForm" (id),
    gloss TEXT NOT NULL,
    count INT NOT NULL,
    UNIQUE ("languageId", "formId", gloss)
);

INSERT INTO "LemmaFormSuggestionCount" ("languageId", "formId", gloss, count)
SELECT ph."languageId", w."formId", g.gloss, COUNT(*) FROM "Gloss" AS g
JOIN "Phrase" AS ph ON ph.id = g."phraseId"
JOIN "PhraseWord" AS phw ON phw."phraseId" = ph.id
JOIN "Word" AS w ON w.id = phw."wordId"
WHERE ph."deletedAt" IS NULL
    AND g.state = 'APPROVED'
GROUP BY ph."languageId", w."formId", g."gloss";

CREATE OR REPLACE FUNCTION increment_suggestion()
RETURNS TRIGGER AS
$$
BEGIN
    IF NEW.state = 'APPROVED' AND (OLD IS NULL OR NEW.gloss <> OLD.gloss OR OLD.state <> 'APPROVED') THEN
        INSERT INTO "LemmaFormSuggestionCount" AS c ("languageId", "formId", "gloss", "count")
        SELECT
            ph."languageId",
            w."formId",
            NEW.gloss,
            1
        FROM "Word" AS w
        JOIN "PhraseWord" AS phw ON phw."wordId" = w.id
        JOIN "Phrase" AS ph ON  phw."phraseId" = ph.id
        WHERE ph.id = NEW."phraseId"
        ON CONFLICT ("languageId", "formId", gloss) DO UPDATE
            SET count = c.count + 1;
    END IF;

    RETURN NULL;
END;
$$
LANGUAGE 'plpgsql';

CREATE TRIGGER increment_suggestion
AFTER INSERT OR UPDATE OF gloss, state
ON "Gloss"
FOR EACH ROW 
EXECUTE FUNCTION increment_suggestion();

CREATE OR REPLACE FUNCTION decrement_suggestion()
RETURNS TRIGGER AS
$$
BEGIN
    IF OLD.state = 'APPROVED' AND (NEW.gloss <> OLD.gloss OR NEW.state <> 'APPROVED') THEN
        UPDATE "LemmaFormSuggestionCount" AS c
        SET
            count = c.count - 1 
        WHERE c.gloss = OLD.gloss
            AND c."languageId" = (SELECT "languageId" FROM "Phrase" WHERE id = OLD."phraseId")
            AND c."formId" IN (
                SELECT w."formId" FROM "Word" AS w
                JOIN "PhraseWord" AS phw ON phw."wordId" = w.id
                JOIN "Phrase" AS ph ON  phw."phraseId" = ph.id
                WHERE ph.id = OLD."phraseId"
            );
    END IF;

    RETURN NULL;
END;
$$
LANGUAGE 'plpgsql';

CREATE TRIGGER decrement_suggestion
AFTER DELETE OR UPDATE OF gloss, state
ON "Gloss"
FOR EACH ROW 
EXECUTE FUNCTION decrement_suggestion();

CREATE OR REPLACE FUNCTION decrement_suggestion_after_phrase_delete()
RETURNS TRIGGER AS
$$
DECLARE
    t_gloss TEXT;
BEGIN
    IF NEW."deletedAt" IS NOT NULL THEN
        -- Ignore phrases with unapproved glosses.
        SELECT "Gloss".gloss INTO t_gloss
        FROM "Gloss"
        WHERE "phraseId" = NEW.id
            AND state = 'APPROVED';
        IF NOT FOUND THEN
            RETURN NULL;
        END IF;

        UPDATE "LemmaFormSuggestionCount" AS c
        SET
            count = c.count - 1 
        WHERE c.gloss = t_gloss
            AND c."languageId" = NEW."languageId"
            AND c."formId" IN (
                SELECT w."formId" FROM "Word" AS w
                JOIN "PhraseWord" AS phw ON phw."wordId" = w.id
                WHERE phw."phraseId" = NEW.id
            );
    END IF;

    RETURN NULL;
END;
$$
LANGUAGE 'plpgsql';

CREATE TRIGGER decrement_suggestion
AFTER UPDATE OF "deletedAt"
ON "Phrase"
FOR EACH ROW 
EXECUTE FUNCTION decrement_suggestion_after_phrase_delete();

COMMIT;

