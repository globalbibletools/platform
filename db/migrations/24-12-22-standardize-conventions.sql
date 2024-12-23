BEGIN;

ALTER TYPE "EmailStatus" RENAME TO email_status;
ALTER TYPE "GlossSource" RENAME TO gloss_source;
ALTER TYPE "GlossState" RENAME TO gloss_state;
ALTER TYPE "LanguageRole" RENAME TO language_role;
ALTER TYPE "ResourceCode" RENAME TO resource_code;
ALTER TYPE "SystemRole" RENAME TO system_role;
ALTER TYPE "TextDirection" RENAME TO text_direction;

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

ALTER TABLE "LemmaFormSuggestionCount" RENAME TO lemma_form_suggestion;
ALTER TABLE lemma_form_suggestion RENAME COLUMN "languageId" TO language_id;
ALTER TABLE lemma_form_suggestion RENAME COLUMN "formId" TO form_id;
ALTER TABLE lemma_form_suggestion RENAME CONSTRAINT "LemmaFormSuggestionCount_formId_fkey" TO lemma_form_suggestion_form_id_fkey;
ALTER TABLE lemma_form_suggestion RENAME CONSTRAINT "LemmaFormSuggestionCount_languageId_fkey" TO lemma_form_suggestion_language_id_fkey;
ALTER INDEX "LemmaFormSuggestionCount_pkey" RENAME TO lemma_form_suggestion_pkey;
ALTER INDEX "LemmaFormSuggestionCount_languageId_formId_gloss_key" RENAME TO lemma_form_suggestion_language_id_form_id_gloss_key;
ALTER SEQUENCE "LemmaFormSuggestionCount_id_seq" RENAME TO lemma_form_suggestion_id_seq;

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
ALTER SEQUENCE "Phrase_id_seq" RENAME TO phrase_id_seq;

ALTER TABLE "PhraseWord" RENAME TO phrase_word;
ALTER TABLE phrase_word RENAME COLUMN "phraseId" TO phrase_id;
ALTER TABLE phrase_word RENAME COLUMN "wordId" TO word_id;
ALTER TABLE phrase_word RENAME CONSTRAINT "PhraseWord_phraseId_fkey" TO phrase_word_phrase_id_fkey;
ALTER TABLE phrase_word RENAME CONSTRAINT "PhraseWord_wordId_fkey" TO phrase_word_word_id_fkey;
ALTER INDEX "PhraseWord_pkey" RENAME TO phrase_word_pkey;
ALTER INDEX "PhraseWord_wordId_phraseId_idx" RENAME TO phrase_word_word_id_phrase_id_idx;

ALTER TABLE "Recording" RENAME TO recording;
ALTER INDEX "Recording_pkey" RENAME TO recording_pkey;

ALTER TABLE "ResetPasswordToken" RENAME TO reset_password_token;
ALTER TABLE reset_password_token RENAME COLUMN "userId" TO user_id;
ALTER TABLE reset_password_token RENAME CONSTRAINT "ResetPasswordToken_userId_fkey" TO reset_password_token_user_id_fkey;
ALTER INDEX "ResetPasswordToken_pkey" RENAME TO reset_password_token_pkey;

ALTER TABLE "Session" RENAME TO session;
ALTER TABLE session RENAME COLUMN "userId" TO user_id;
ALTER TABLE session RENAME COLUMN "expiresAt" TO expires_at;
ALTER TABLE session RENAME CONSTRAINT "Session_userId_fkey" TO session_user_id_fkey;
ALTER INDEX "Session_pkey" RENAME TO session_pkey;
ALTER INDEX "Session_id_key" RENAME TO session_id_key;
ALTER INDEX "Session_userId_idx" RENAME TO session_user_id_idx;

ALTER TABLE "TranslatorNote" RENAME TO translator_note;
ALTER TABLE translator_note RENAME COLUMN "authorId" TO author_id;
ALTER TABLE translator_note RENAME COLUMN "phraseId" TO phrase_id;
ALTER TABLE translator_note RENAME CONSTRAINT "TranslatorNote_authorId_fkey" TO translator_note_author_id_fkey;
ALTER TABLE translator_note RENAME CONSTRAINT "TranslatorNote_phraseId_fkey" TO translator_note_phase_id_fkey;
ALTER INDEX "TranslatorNote_pkey" RENAME TO translator_note_pkey;
ALTER INDEX "TranslatorNote_phraseId_idx" RENAME TO translator_note_phrase_id_idx;

ALTER TABLE "User" RENAME TO users;
ALTER TABLE users RENAME COLUMN "emailStatus" TO email_status;
ALTER TABLE users RENAME COLUMN "hashedPassword" TO hashed_password;
ALTER INDEX "User_pkey" RENAME TO users_pkey;
ALTER INDEX "User_email_key" RENAME TO user_email_key;

ALTER TABLE "UserEmailVerification" RENAME TO user_email_verification;
ALTER TABLE user_email_verification RENAME COLUMN "userId" TO user_id;
ALTER TABLE user_email_verification RENAME CONSTRAINT "UserEmailVerification_userId_fkey" TO user_email_verification_user_id_fkey;
ALTER INDEX "UserEmailVerification_pkey" RENAME TO user_email_verification_pkey;
ALTER INDEX "UserEmailVerification_token_key" RENAME TO user_email_verification_token_key;

ALTER TABLE "UserInvitation" RENAME TO user_invitation;
ALTER TABLE user_invitation RENAME COLUMN "userId" TO user_id;
ALTER TABLE user_invitation RENAME CONSTRAINT "UserInvitation_userId_fkey" TO user_invitation_user_id_fkey;
ALTER INDEX "UserInvitation_pkey" RENAME TO user_invitation_pkey;
ALTER INDEX "UserInvitation_userId_key" RENAME TO user_invitation_user_id_pkey;

ALTER TABLE "UserSystemRole" RENAME TO user_system_role;
ALTER TABLE user_system_role RENAME COLUMN "userId" TO user_id;
ALTER TABLE user_system_role RENAME CONSTRAINT "UserSystemRole_userId_fkey" TO user_system_role_user_id_fkey;
ALTER INDEX "UserSystemRole_pkey" RENAME TO user_system_role_pkey;

ALTER TABLE "Verse" RENAME TO verse;
ALTER TABLE verse RENAME COLUMN "bookId" TO book_id;
ALTER TABLE verse RENAME CONSTRAINT "Verse_bookId_fkey" TO verse_book_id_fkey;
ALTER INDEX "Verse_pkey" RENAME TO verse_pkey;
ALTER INDEX "Verse_bookId_chapter_number_key" RENAME TO verse_book_id_chapter_number_key;

ALTER TABLE "VerseAudioTiming" RENAME TO verse_audio_timing;
ALTER TABLE verse_audio_timing RENAME COLUMN "verseId" TO verse_id;
ALTER TABLE verse_audio_timing RENAME COLUMN "recordingId" TO recording_id;
ALTER TABLE verse_audio_timing RENAME CONSTRAINT "VerseAudioTiming_recordingId_fkey" TO verse_audio_timing_recording_id_fkey;
ALTER TABLE verse_audio_timing RENAME CONSTRAINT "VerseAudioTiming_verseId_fkey" TO verse_audio_timing_verse_id_fkey;
ALTER INDEX "VerseAudioTiming_pkey" RENAME TO verse_audio_timing_pkey;
ALTER INDEX "VerseAudioTiming_verseId_recordingId_key" RENAME TO verse_audio_timing_verse_id_recording_id_key;
ALTER SEQUENCE "VerseAudioTiming_id_seq" RENAME TO verse_audio_timing_id_seq;

ALTER TABLE "Word" RENAME TO word;
ALTER TABLE word RENAME COLUMN "verseId" TO verse_id;
ALTER TABLE word RENAME COLUMN "formId" TO form_id;
ALTER TABLE word RENAME CONSTRAINT "Word_formId_fkey" TO word_form_id_fkey;
ALTER TABLE word RENAME CONSTRAINT "Word_verseId_fkey" TO word_verse_id_fkey;
ALTER INDEX "Word_pkey" RENAME TO word_pkey;
ALTER INDEX "Word_formId_idx" RENAME TO word_form_id_idx;
ALTER INDEX "Word_verseId_idx" RENAME TO word_verse_id_idx;

DROP MATERIALIZED VIEW "LanguageProgress";
CREATE MATERIALIZED VIEW language_progress AS (
    WITH data AS (
        SELECT ph.language_id AS id, v.book_id >= 40 AS is_nt, COUNT(*) AS count FROM phrase AS ph
        JOIN phrase_word AS phw ON phw.phrase_id = ph.id
        JOIN word AS w ON w.id = phw.word_id
        JOIN verse AS v ON v.id = w.verse_id
        JOIN gloss AS g ON g.phrase_id = ph.id
        WHERE ph.deleted_at IS NULL
        GROUP BY ph.language_id, v.book_id >= 40
    ),
    ot_total AS (
        SELECT COUNT(*) AS total FROM word AS w
        JOIN verse AS v ON v.id = w.verse_id
        WHERE v.book_id < 40
    ),
    nt_total AS (
        SELECT COUNT(*) AS total FROM word AS w
        JOIN verse AS v ON v.id = w.verse_id
        WHERE v.book_id >= 40
    )
    SELECT
        l.code,
        COALESCE(nt_data.count, 0)::float / (SELECT nt_total.total::float FROM nt_total) AS "nt_progress",
        COALESCE(ot_data.count, 0)::float / (SELECT ot_total.total::float FROM ot_total) AS "ot_progress"
    FROM language AS l
    LEFT JOIN data AS nt_data
        ON nt_data.id = l.id AND nt_data.is_nt = TRUE
    LEFT JOIN data AS ot_data
        ON ot_data.id = l.id AND ot_data.is_nt = FALSE
);

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
        INSERT INTO lemma_form_suggestion AS c (language_id, form_id, gloss, count)
        SELECT
            ph.language_id,
            w.form_id,
            NEW.gloss,
            1
        FROM word AS w
        JOIN phrase_word AS phw ON phw.word_id = w.id
        JOIN phrase AS ph ON  phw.phrase_id = ph.id
        WHERE ph.id = NEW.phrase_id
        ON CONFLICT (language_id, form_id, gloss) DO UPDATE
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
        UPDATE lemma_form_suggestion AS c
        SET
            count = c.count - 1 
        WHERE c.gloss = OLD.gloss
            AND c.language_id = (SELECT language_id FROM phrase WHERE id = OLD.phrase_id)
            AND c.form_id IN (
                SELECT w.form_id FROM word AS w
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

        UPDATE lemma_form_suggestion AS c
        SET
            count = c.count - 1 
        WHERE c.gloss = t_gloss
            AND c.language_id = NEW.language_id
            AND c.form_id IN (
                SELECT w.form_id FROM word AS w
                JOIN phrase_word AS phw ON phw.word_id = w.id
                WHERE phw.phrase_id = NEW.id
            );
    END IF;

    RETURN NULL;
END;
$$
LANGUAGE 'plpgsql';

CREATE OR REPLACE FUNCTION public.generate_gloss_statistics_for_week(d TIMESTAMP)
RETURNS void
LANGUAGE SQL
AS $$
    INSERT INTO weekly_gloss_statistics (week, language_id, book_id, user_id, approved_count, unapproved_count)
    SELECT
        (DATE_BIN('7 days', DATE_TRUNC('day', $1), TIMESTAMP '2024-12-15')),
        log.language_id, log.book_id, log.updated_by,
        COUNT(*) FILTER (WHERE log.state = 'APPROVED'),
        COUNT(*) FILTER (WHERE log.state = 'UNAPPROVED')
    FROM (
        SELECT
            DISTINCT ON (log.phrase_id, phrase_word.word_id, verse.book_id)
            log.updated_by,
            log.state,
            phrase.language_id,
            verse.book_id
        FROM (
            (
                SELECT phrase_id, updated_by, updated_at, gloss, state
                FROM gloss
            ) UNION ALL (
                SELECT phrase_id, updated_by, updated_at, gloss, state
                FROM gloss_history
            )
        ) log
        JOIN phrase ON phrase.id = log.phrase_id
        JOIN phrase_word ON phrase_word.phrase_id = phrase.id
        JOIN word ON word.id = phrase_word.word_id
        JOIN verse ON verse.id = word.verse_id
        WHERE log.updated_at < (DATE_BIN('7 days', DATE_TRUNC('day', $1), TIMESTAMP '2024-12-15'))
            AND (phrase.deleted_at IS NULL
                OR phrase.deleted_at < (DATE_BIN('7 days', DATE_TRUNC('day', $1), TIMESTAMP '2024-12-15')))
        ORDER BY log.phrase_id, phrase_word.word_id, verse.book_id, log.updated_at DESC
    ) log
    GROUP BY log.language_id, log.book_id, log.updated_by
    ORDER BY log.language_id, log.book_id, log.updated_by
    ON CONFLICT (language_id, book_id, user_id, week)
    DO UPDATE SET
        approved_count = EXCLUDED.approved_count,
        unapproved_count = EXCLUDED.unapproved_count;
$$;

COMMIT;
