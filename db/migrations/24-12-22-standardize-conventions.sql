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

ALTER TABLE "LemmaForm" RENAME TO lemma_form;
ALTER TABLE lemma_form RENAME COLUMN "lemmaId" TO lemma_id;
ALTER TABLE lemma_form RENAME CONSTRAINT "LemmaForm_lemmaId_fkey" TO lemma_form_lemma_id_fkey;
ALTER INDEX "LemmaForm_pkey" RENAME TO lemma_form_pkey;
ALTER INDEX "LemmaForm_lemmaId_idx" RENAME TO lemma_form_lemma_id_idx;

ALTER TABLE "LemmaResource" RENAME TO lemma_resource;
ALTER TABLE lemma_resource RENAME COLUMN "lemmaId" TO lemma_id;
ALTER TABLE lemma_resource RENAME COLUMN "resourceCode" TO resource_code;
ALTER TABLE lemma_resource RENAME CONSTRAINT "LemmaResource_lemmaId_fkey" TO lemma_resource_lemma_id_fkey;
ALTER INDEX "LemmaResource_pkey" RENAME TO lemma_resource_pkey;
ALTER INDEX "LemmaResource_lemmaId_idx" RENAME TO lemma_resource_lemma_id_idx;

ALTER TABLE "MachineGloss" RENAME TO machine_gloss;
ALTER TABLE machine_gloss RENAME COLUMN "wordId" TO word_id;
ALTER TABLE machine_gloss RENAME COLUMN "languageId" TO language_id;
ALTER TABLE machine_gloss RENAME CONSTRAINT "MachineGloss_languageId_fkey" TO machine_gloss_language_id_fkey;
ALTER TABLE machine_gloss RENAME CONSTRAINT "MachineGloss_wordId_fkey" TO machine_gloss_word_id_fkey;
ALTER INDEX "MachineGloss_pkey" RENAME TO machine_gloss_pkey;

ALTER TABLE "Phrase" RENAME TO phrase;
ALTER TABLE phrase RENAME COLUMN "languageId" TO language_id;
ALTER TABLE phrase RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE phrase RENAME COLUMN "createdBy" TO created_by;
ALTER TABLE phrase RENAME COLUMN "deletedAt" TO deleted_at;
ALTER TABLE phrase RENAME COLUMN "deletedBy" TO deleted_by;
ALTER TABLE phrase RENAME CONSTRAINT "Phrase_createdBy_fkey" TO phrase_created_by_fkey;
ALTER TABLE phrase RENAME CONSTRAINT "Phrase_deletedBy_fkey" TO phrase_deleted_by_fkey;
ALTER TABLE phrase RENAME CONSTRAINT "Phrase_languageId_fkey" TO phrase_language_id_fkey;
ALTER INDEX "Phrase_pkey" RENAME TO phrase_pkey;
ALTER INDEX "Phrase_languageId_deletedAt_idx" RENAME TO phrase_language_id_deleted_at_idx;

ALTER TABLE "PhraseWord" RENAME TO phrase_word;
ALTER TABLE phrase_word RENAME COLUMN "phraseId" TO phrase_id;
ALTER TABLE phrase_word RENAME COLUMN "wordId" TO word_id;
ALTER TABLE phrase_word RENAME CONSTRAINT "PhraseWord_phraseId_fkey" TO phrase_word_phrase_id_fkey;
ALTER TABLE phrase_word RENAME CONSTRAINT "PhraseWord_wordId_fkey" TO phrase_word_word_id_fkey;
ALTER INDEX "PhraseWord_pkey" RENAME TO phrase_word_pkey;
ALTER INDEX "PhraseWord_wordId_phraseId_idx" RENAME TO phrase_word_word_id_phrase_id_idx;

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
            ph.language_id,
            w."formId",
            NEW.gloss,
            1
        FROM "Word" AS w
        JOIN phrase_word AS phw ON phw.word_id = w.id
        JOIN phrase AS ph ON  phw.phrase_id = ph.id
        WHERE ph.id = NEW.phrase_id
        ON CONFLICT ("languageId", "formId", gloss) DO UPDATE
            SET count = c.count + 1;
    END IF;

    RETURN NULL;
END;
$$
LANGUAGE 'plpgsql';

CREATE OR REPLACE FUNCTION decrement_suggestion()
RETURNS TRIGGER AS
$$
BEGIN
    IF OLD.state = 'APPROVED' AND (NEW.gloss <> OLD.gloss OR NEW.state <> 'APPROVED') THEN
        UPDATE "LemmaFormSuggestionCount" AS c
        SET
            count = c.count - 1 
        WHERE c.gloss = OLD.gloss
            AND c."languageId" = (SELECT language_id FROM phrase WHERE id = OLD.phrase_id)
            AND c."formId" IN (
                SELECT w."formId" FROM "Word" AS w
                JOIN phrase_word AS phw ON phw.word_id = w.id
                JOIN phrase AS ph ON  phw.phrase_id = ph.id
                WHERE ph.id = OLD.phrase_id
            );
    END IF;

    RETURN NULL;
END;
$$
LANGUAGE 'plpgsql';

CREATE OR REPLACE FUNCTION decrement_suggestion_after_phrase_delete()
RETURNS TRIGGER AS
$$
DECLARE
    t_gloss TEXT;
BEGIN
    IF NEW.deleted_at IS NOT NULL THEN
        -- Ignore phrases with unapproved glosses.
        SELECT gloss.gloss INTO t_gloss
        FROM gloss
        WHERE phrase_id = NEW.id
            AND state = 'APPROVED';
        IF NOT FOUND THEN
            RETURN NULL;
        END IF;

        UPDATE "LemmaFormSuggestionCount" AS c
        SET
            count = c.count - 1 
        WHERE c.gloss = t_gloss
            AND c."languageId" = NEW.language_id
            AND c."formId" IN (
                SELECT w."formId" FROM "Word" AS w
                JOIN phrase_word AS phw ON phw.word_id = w.id
                WHERE phw.phrase_id = NEW.id
            );
    END IF;

    RETURN NULL;
END;
$$
LANGUAGE 'plpgsql';

COMMIT;
