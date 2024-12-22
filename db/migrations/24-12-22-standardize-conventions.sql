BEGIN;

ALTER TABLE "Book" RENAME TO book;
ALTER INDEX "Book_pkey" RENAME TO book_pkey;
ALTER INDEX "Book_name_key" RENAME TO book_name_key;

ALTER TABLE "Footnote" RENAME TO footnote;
ALTER TABLE footnote RENAME COLUMN "phraseId" TO phrase_id;
ALTER TABLE footnote RENAME COLUMN "authorId" TO author_id;
ALTER TABLE footnote RENAME CONSTRAINT "Footnote_authorId_fkey" TO footnote_author_id_fkey;
ALTER TABLE footnote RENAME CONSTRAINT "Footnote_phraseId_fkey" TO footnote_phrase_id_fkey;
ALTER INDEX "Footnote_pkey" RENAME TO footnote_pkey;
ALTER INDEX "Footnote_phraseId_idx" RENAME TO footnote_phrase_id_idx;

ALTER TABLE "Gloss" RENAME TO gloss;
ALTER TABLE gloss RENAME COLUMN "phraseId" TO phrase_id;
ALTER TABLE gloss RENAME CONSTRAINT "Gloss_phraseId_fkey" TO gloss_phrase_id_fkey;
ALTER TABLE gloss RENAME CONSTRAINT "Gloss_updated_by_fkey" TO gloss_updated_by_fkey;
ALTER INDEX "Gloss_pkey" RENAME TO gloss_pkey;
ALTER INDEX "Gloss_phraseId_idx" RENAME TO gloss_phrase_id_idx;

ALTER TABLE "Language" RENAME TO language;
ALTER TABLE language RENAME COLUMN "bibleTranslationIds" TO translation_ids;
ALTER TABLE language RENAME COLUMN "textDirection" TO text_direction;
ALTER INDEX "Language_pkey" RENAME TO language_pkey;
ALTER INDEX "Language_code_key" RENAME TO language_code_idx;

ALTER TABLE "LanguageImportJob" RENAME TO language_import_job;
ALTER TABLE language_import_job RENAME COLUMN "languageId" TO language_id;
ALTER TABLE language_import_job RENAME COLUMN "startDate" TO start_date;
ALTER TABLE language_import_job RENAME COLUMN "endDate" TO end_date;
ALTER TABLE language_import_job RENAME COLUMN "userId" TO user_id;
ALTER TABLE language_import_job RENAME CONSTRAINT "LanguageImportJob_languageId_fkey" TO language_import_job_language_id_fkey;
ALTER TABLE language_import_job RENAME CONSTRAINT "LanguageImportJob_userId_fkey" TO language_import_job_user_id_fkey;
ALTER INDEX "LanguageImportJob_pkey" RENAME TO language_import_job_pkey;

ALTER TABLE "LanguageMemberRole" RENAME TO language_member_role;
ALTER TABLE language_member_role RENAME COLUMN "userId" TO user_id;
ALTER TABLE language_member_role RENAME COLUMN "languageId" TO language_id;
ALTER TABLE language_member_role RENAME CONSTRAINT "LanguageMemberRole_languageId_fkey" TO language_member_role_language_id_fkey;
ALTER TABLE language_member_role RENAME CONSTRAINT "LanguageMemberRole_userId_fkey" TO language_member_role_user_id_fkey;
ALTER INDEX "LanguageMemberRole_pkey" RENAME TO language_member_role_pkey;

ALTER TABLE "Lemma" RENAME TO lemma;
ALTER INDEX "Lemma_pkey" RENAME TO lemma_pkey;

CREATE OR REPLACE FUNCTION gloss_audit()
RETURNS TRIGGER AS
$$
BEGIN
    INSERT INTO gloss_history AS c (phrase_id, gloss, state, source, updated_at, updated_by)
    VALUES (OLD.phrase_id, OLD.gloss, OLD.state, OLD.source, OLD.updated_at, OLD.updated_by);

    RETURN NULL;
END;
$$
LANGUAGE 'plpgsql';

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
        WHERE ph.id = NEW.phrase_id
        ON CONFLICT ("languageId", "formId", gloss) DO UPDATE
            SET count = c.count + 1;
    END IF;

    RETURN NULL;
END;
$$
LANGUAGE 'plpgsql';

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
        WHERE ph.id = NEW.phrase_id
        ON CONFLICT ("languageId", "formId", gloss) DO UPDATE
            SET count = c.count + 1;
    END IF;

    RETURN NULL;
END;
$$
LANGUAGE 'plpgsql';


COMMIT;
