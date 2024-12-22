"use server";

import * as z from 'zod';
import { getLocale, getTranslations } from 'next-intl/server';
import { parseForm } from '@/app/form-parser';
import { notFound, redirect } from 'next/navigation';
import { parseReference } from '@/app/verse-utils';
import { query, transaction } from '@/shared/db';
import { verifySession } from '@/app/session';
import { revalidatePath } from 'next/cache';
import { translateClient } from '@/app/google-translate';
import languageMap from "@/data/locale-mapping.json"

const requestSchema = z.object({
    language: z.string(),
    reference: z.string()
})

export async function changeInterlinearLocation(formData: FormData): Promise<void> {
    const locale = await getLocale();
    const t = await getTranslations('TranslationToolbar');

    const request = requestSchema.safeParse(parseForm(formData));
    if (!request.success) {
        return
    }

    let verseId
    try {
        verseId = parseReference(request.data.reference, t.raw('book_names'))
    } catch (error) {
        console.log(error)
        return
    }

    redirect(`/${locale}/translate/${request.data.language}/${verseId}`)
}

const redirectToUnapprovedSchema = z.object({
    code: z.string(),
    verseId: z.string()
})

export async function redirectToUnapproved(formData: FormData): Promise<void | string> {
    const request = redirectToUnapprovedSchema.safeParse(parseForm(formData));
    if (!request.success) {
        return
    }

    let result = await query<{ nextUnapprovedVerseId: string }>(
        `
        SELECT w."verseId" as "nextUnapprovedVerseId"
        FROM "Word" AS w
        LEFT JOIN LATERAL (
          SELECT g.state AS state FROM "PhraseWord" AS phw
          JOIN "Phrase" AS ph ON ph.id = phw."phraseId"
          LEFT JOIN gloss AS g ON g.phrase_id = ph.id
          WHERE phw."wordId" = w.id
			      AND ph."languageId" = (SELECT id FROM language WHERE code = $1)
			      AND ph."deletedAt" IS NULL
        ) AS g ON true
        WHERE w."verseId" > $2
          AND (g.state = 'UNAPPROVED' OR g.state IS NULL)
        ORDER BY w."id"
        LIMIT 1
        `,
        [request.data.code, request.data.verseId]
    )

    if (result.rows.length === 0) {
        result = await query<{ nextUnapprovedVerseId: string }>(
            `
            SELECT w."verseId" as "nextUnapprovedVerseId"
            FROM "Word" AS w
            LEFT JOIN LATERAL (
              SELECT g.state AS state FROM "PhraseWord" AS phw
              JOIN "Phrase" AS ph ON ph.id = phw."phraseId"
              LEFT JOIN gloss AS g ON g.phrase_id = ph.id
              WHERE phw."wordId" = w.id
                      AND ph."languageId" = (SELECT id FROM language WHERE code = $1)
                      AND ph."deletedAt" IS NULL
            ) AS g ON true
            WHERE (g.state = 'UNAPPROVED' OR g.state IS NULL)
            ORDER BY w."id"
            LIMIT 1
            `,
            [request.data.code]
        )

        if (result.rows.length === 0) {
            const t = await getTranslations('TranslationToolbar')
            return t('errors.all_approved')
        }
    }

    const locale = await getLocale();
    redirect(`/${locale}/translate/${request.data.code}/${result.rows[0].nextUnapprovedVerseId}`)
}

const approveAllSchema = z.object({
    code: z.string(),
    phrases: z.array(z.object({ id: z.coerce.number(), gloss: z.string() }))
})

export async function approveAll(formData: FormData): Promise<void> {
    const session = await verifySession()
    if (!session?.user) {
        notFound()
    }

    const request = approveAllSchema.safeParse(parseForm(formData));
    if (!request.success) {
        return
    }

    const languageQuery = await query<{ roles: string[] }>(
        `SELECT 
            COALESCE(json_agg(r.role) FILTER (WHERE r.role IS NOT NULL), '[]') AS roles
        FROM "LanguageMemberRole" AS r
        WHERE r."languageId" = (SELECT id FROM language WHERE code = $1) 
            AND r."userId" = $2`,
        [request.data.code, session.user.id]
    )
    const language = languageQuery.rows[0]
    if (!language || (!session?.user.roles.includes('ADMIN') && !language.roles.includes('TRANSLATOR'))) {
        notFound()
    }

    await query<{ phraseId: number; gloss: string, state: string }>(
        `
        INSERT INTO gloss (phrase_id, gloss, state, updated_at, updated_by, source)
        SELECT ph.id, data.gloss, 'APPROVED', NOW(), $3, 'USER'
        FROM UNNEST($1::integer[], $2::text[]) data (phrase_id, gloss)
        JOIN "Phrase" AS ph ON ph.id = data.phrase_id
        WHERE ph."deletedAt" IS NULL
        ON CONFLICT (phrase_id)
            DO UPDATE SET
                gloss = COALESCE(EXCLUDED.gloss, gloss.gloss),
                state = EXCLUDED.state,
                updated_at = EXCLUDED.updated_at,
                updated_by = EXCLUDED.updated_by, 
                source = EXCLUDED.source
                WHERE EXCLUDED.state <> gloss.state OR EXCLUDED.gloss <> gloss.gloss
        `,
        [request.data.phrases.map(ph => ph.id), request.data.phrases.map(ph => ph.gloss), session.user.id]
    )

    const pathQuery = await query<{ verseId: string }>(
        `
        SELECT w."verseId" FROM "Phrase" AS ph
        JOIN "PhraseWord" AS phw ON phw."phraseId" = ph.id
        JOIN "Word" AS w ON w.id = phw."wordId"
        WHERE ph.id = $1
        LIMIT 1
        `,
        [request.data.phrases[0].id]
    )

    const locale = await getLocale()
    revalidatePath(`/${locale}/translate/${request.data.code}/${pathQuery.rows[0].verseId}`)
}

const linkWordsSchema = z.object({
    code: z.string(),
    wordIds: z.array(z.string())
})

export async function linkWords(formData: FormData): Promise<void> {
    const session = await verifySession()
    if (!session?.user) {
        notFound()
    }

    const request = linkWordsSchema.safeParse(parseForm(formData));
    if (!request.success) {
        return
    }

    const languageQuery = await query<{ roles: string[] }>(
        `SELECT 
            COALESCE(json_agg(r.role) FILTER (WHERE r.role IS NOT NULL), '[]') AS roles
        FROM "LanguageMemberRole" AS r
        WHERE r."languageId" = (SELECT id FROM language WHERE code = $1) 
            AND r."userId" = $2`,
        [request.data.code, session.user.id]
    )
    const language = languageQuery.rows[0]
    if (!language || (!session?.user.roles.includes('ADMIN') && !language.roles.includes('TRANSLATOR'))) {
        notFound()
    }

    await transaction(async query => {
        const phrasesQuery = await query(
            `
            SELECT FROM "Phrase" AS ph
            JOIN "PhraseWord" AS phw ON phw."phraseId" = ph.id
            JOIN LATERAL (
                SELECT COUNT(*) AS count FROM "PhraseWord" AS phw
                WHERE phw."phraseId" = ph.id
            ) AS words ON true
            WHERE ph."languageId" = (SELECT id FROM language WHERE code = $1)
                AND ph."deletedAt" IS NULL
                AND phw."wordId" = ANY($2::text[])
                AND words.count > 1
            `,
            [request.data.code, request.data.wordIds]
        )
        if (phrasesQuery.rows.length > 0) {
            throw new Error('Words already linked')
        }

        await query(
            `
            UPDATE "Phrase" AS ph
                SET "deletedAt" = NOW(),
                    "deletedBy" = $3
            FROM "PhraseWord" AS phw
            WHERE phw."phraseId" = ph.id
                AND phw."wordId" = ANY($2::text[])
                AND ph."deletedAt" IS NULL
                AND ph."languageId" = (SELECT id FROM language WHERE code = $1)
            `,
            [request.data.code, request.data.wordIds, session.user.id]
        )

        await query(
            `
                WITH phrase AS (
                    INSERT INTO "Phrase" ("languageId", "createdBy", "createdAt")
                    VALUES ((SELECT id FROM language WHERE code = $1), $3, NOW())
                    RETURNING id
                )
                INSERT INTO "PhraseWord" ("phraseId", "wordId")
                SELECT phrase.id, UNNEST($2::text[]) FROM phrase
            `,
            [request.data.code, request.data.wordIds, session.user.id]
        )
    })

    const pathQuery = await query<{ verseId: string }>(
        `
        SELECT w."verseId" FROM "Word" AS w
        WHERE w.id = $1
        `,
        [request.data.wordIds[0]]
    )

    const locale = await getLocale()
    revalidatePath(`/${locale}/translate/${request.data.code}/${pathQuery.rows[0].verseId}`)
}

const unlinkPhraseSchema = z.object({
    code: z.string(),
    phraseId: z.coerce.number()
})

export async function unlinkPhrase(formData: FormData): Promise<void> {
    const session = await verifySession()
    if (!session?.user) {
        notFound()
    }

    const request = unlinkPhraseSchema.safeParse(parseForm(formData));
    if (!request.success) {
        return
    }

    const languageQuery = await query<{ roles: string[] }>(
        `SELECT 
            COALESCE(json_agg(r.role) FILTER (WHERE r.role IS NOT NULL), '[]') AS roles
        FROM "LanguageMemberRole" AS r
        WHERE r."languageId" = (SELECT id FROM language WHERE code = $1) 
            AND r."userId" = $2`,
        [request.data.code, session.user.id]
    )
    const language = languageQuery.rows[0]
    if (!language || (!session?.user.roles.includes('ADMIN') && !language.roles.includes('TRANSLATOR'))) {
        notFound()
    }

    await query(
        `
        UPDATE "Phrase" AS ph
            SET
                "deletedAt" = NOW(),
                "deletedBy" = $3
        WHERE ph."languageId" = (SELECT id FROM language WHERE code = $1)
            AND ph.id = $2
        `,
        [request.data.code, request.data.phraseId, session.user.id]
    )

    const pathQuery = await query<{ verseId: string }>(
        `
        SELECT w."verseId" FROM "Phrase" AS ph
        JOIN "PhraseWord" AS phw ON phw."phraseId" = ph.id
        JOIN "Word" AS w ON w.id = phw."wordId"
        WHERE ph.id = $1
        LIMIT 1
        `,
        [request.data.phraseId]
    )

    const locale = await getLocale()
    revalidatePath(`/${locale}/translate/${request.data.code}/${pathQuery.rows[0].verseId}`)
}

const sanityCheckSchema = z.object({
    code: z.string(),
    verseId: z.string()
})

type SanityCheckResult =
| { state: 'idle' }
| { state: 'error', error?: string }
| { state: 'success', data: { translation: string, phraseId: number }[] }

export async function sanityCheck(_prev: SanityCheckResult, formData: FormData): Promise<SanityCheckResult> {
    const session = await verifySession()
    if (!session?.user.roles.includes('ADMIN')) {
        notFound()
    }

    const request = sanityCheckSchema.safeParse(parseForm(formData));
    if (!request.success) {
        return { state: 'error' }
    }

    const glossesQuery = await query<{ phraseId: number, gloss: string | null }>(
        `SELECT
            ph.id as "phraseId",
            g.gloss
        FROM gloss g
        JOIN "Phrase" ph ON ph.id = g.phrase_id
        WHERE ph."deletedAt" IS NULL
            AND ph."languageId" = (SELECT id FROM language WHERE code = $1)
            AND EXISTS (
                SELECT FROM "PhraseWord" phw
                JOIN "Word" w ON w.id = phw."wordId"
                WHERE phw."phraseId" = ph.id
                    AND w."verseId" = $2
            )
        `,
        [request.data.code, request.data.verseId]
    )
    const glosses = glossesQuery.rows

    const translations = await backtranslate(request.data.code, glosses.filter((g): g is { gloss: string, phraseId: number } => !!g.gloss))

    return { state: 'success', data: translations }
}

async function backtranslate(code: string, glosses: { gloss: string, phraseId: number }[]): Promise<{ translation: string, phraseId: number }[]> {
    const languageCode = languageMap[code as keyof typeof languageMap];
    if (!languageCode || languageCode === 'en' || !translateClient || glosses.length === 0) return []
    
    const translations = await translateClient.translate(glosses.map(g => g.gloss), 'en', languageCode)
    return translations.map((t, i) => ({ phraseId: glosses[i].phraseId, translation: t }))
}
