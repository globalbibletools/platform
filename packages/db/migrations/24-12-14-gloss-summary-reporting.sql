CREATE TABLE weekly_gloss_statistics (
    id SERIAL PRIMARY KEY,
    week TIMESTAMP NOT NULL,
    language_id UUID NOT NULL REFERENCES "Language" (id),
    book_id INT NOT NULL REFERENCES "Book" (id),
    user_id UUID REFERENCES "User" (id),
    approved_count INT NOT NULL,
    unapproved_count INT NOT NULL,
    UNIQUE (week, language_id, book_id, user_id)
);

CREATE FUNCTION public.generate_gloss_statistics_for_week(d TIMESTAMP)
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
            DISTINCT ON (log.phrase_id, phrase_word."wordId", verse."bookId")
            log.updated_by,
            log.state,
            phrase."languageId" AS language_id,
            verse."bookId" AS book_id
        FROM (
            (
                SELECT
                    "phraseId" AS phrase_id,
                    updated_by, updated_at, gloss, state
                FROM "Gloss" gloss
            ) UNION ALL (
                SELECT
                    phrase_id, updated_by, updated_at, gloss, state
                FROM gloss_history
            )
        ) log
        JOIN "Phrase" phrase ON phrase.id = log.phrase_id
        JOIN "PhraseWord" phrase_word ON phrase_word."phraseId" = phrase.id
        JOIN "Word" word ON word.id = "phrase_word"."wordId"
        JOIN "Verse" verse ON verse.id = word."verseId"
        WHERE log.updated_at < (DATE_BIN('7 days', DATE_TRUNC('day', $1), TIMESTAMP '2024-12-15'))
            AND (phrase."deletedAt" IS NULL
                OR phrase."deletedAt" < (DATE_BIN('7 days', DATE_TRUNC('day', $1), TIMESTAMP '2024-12-15')))
        ORDER BY log.phrase_id, phrase_word."wordId", verse."bookId", log.updated_at DESC
    ) log
    GROUP BY log.language_id, log.book_id, log.updated_by
    ORDER BY log.language_id, log.book_id, log.updated_by
    ON CONFLICT (language_id, book_id, user_id, week)
    DO UPDATE SET
        approved_count = EXCLUDED.approved_count,
        unapproved_count = EXCLUDED.unapproved_count;
$$;

SELECT cron.schedule(
    'Generate Weekly Gloss Statistics',
    '5 0 * * 0',
    'SELECT generate_weekly_glossing_report(NOW());'
);

SELECT generate_gloss_statistics_for_week(week) FROM (
    SELECT TIMESTAMP '2024-02-04' + INTERVAL '7 days' * generate_series(0, FLOOR(EXTRACT(day FROM NOW() - TIMESTAMP '2024-02-04') / 7) - 1) AS week
) series;
