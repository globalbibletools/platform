BEGIN;

CREATE MATERIALIZED VIEW "LanguageProgress" AS (
    WITH data AS (
        SELECT ph."languageId" AS id, v."bookId" >= 40 AS is_nt, COUNT(*) AS count FROM "Phrase" AS ph
        JOIN "PhraseWord" AS phw ON phw."phraseId" = ph.id
        JOIN "Word" AS w ON w.id = phw."wordId"
        JOIN "Verse" AS v ON v.id = w."verseId"
        JOIN "Gloss" AS g ON g."phraseId" = ph.id
        WHERE ph."deletedAt" IS NULL
        GROUP BY ph."languageId", v."bookId" >= 40
    ),
    ot_total AS (
        SELECT COUNT(*) AS total FROM "Word" AS w
        JOIN "Verse" AS v ON v.id = w."verseId"
        WHERE v."bookId" < 40
    ),
    nt_total AS (
        SELECT COUNT(*) AS total FROM "Word" AS w
        JOIN "Verse" AS v ON v.id = w."verseId"
        WHERE v."bookId" >= 40
    )
    SELECT
        l.code,
        COALESCE(nt_data.count, 0)::float / (SELECT nt_total.total::float FROM nt_total) AS "ntProgress",
        COALESCE(ot_data.count, 0)::float / (SELECT ot_total.total::float FROM ot_total) AS "otProgress"
    FROM "Language" AS l
    LEFT JOIN data AS nt_data
        ON nt_data.id = l.id AND nt_data.is_nt = TRUE
    LEFT JOIN data AS ot_data
        ON ot_data.id = l.id AND ot_data.is_nt = FALSE
);

CREATE EXTENSION pg_cron;

SELECT cron.schedule('Refresh Language Progress', '0 0 * * *', 'REFRESH MATERIALIZED VIEW "LanguageProgress";');

COMMIT;
