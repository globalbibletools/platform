"use server";

import { query, transaction } from '@/app/db';
import { parseForm } from '@/app/form-parser';
import { verifySession } from '@/app/session';
import { bookKeys } from '@/data/book-keys';
import { BibleClient } from '@gracious.tech/fetch-client';
import { getLocale } from 'next-intl/server';
import { revalidatePath } from 'next/cache';
import { notFound } from 'next/navigation';
import * as z from 'zod';
import { parseVerseId } from '../verse-utils';

const updateGlossSchema = z.object({
    phraseId: z.coerce.number().int(),
    state: z.enum(['APPROVED', 'UNAPPROVED']).optional(),
    gloss: z.string().optional()
})

export async function updateGloss(prevState: any, formData: FormData): Promise<any> {
    const session = await verifySession()
    if (!session?.user) {
        notFound()
    }

    const request = updateGlossSchema.safeParse(parseForm(formData));
    if (!request.success) {
        return
    }

    const languageQuery = await query<{ roles: string[] }>(
        `SELECT 
            COALESCE(json_agg(r.role) FILTER (WHERE r.role IS NOT NULL), '[]') AS roles
        FROM "LanguageMemberRole" AS r
        WHERE r."languageId" = (SELECT "languageId" FROM "Phrase" WHERE id = $1) 
            AND r."userId" = $2`,
        [request.data.phraseId, session.user.id]
    )
    const language = languageQuery.rows[0]
    if (!language || (!session?.user.roles.includes('ADMIN') && !language.roles.includes('TRANSLATOR'))) {
        notFound()
    }

    await transaction(async query => {
        const oldGlossQuery = await query<{ state: string, gloss: string }>(
            `SELECT state, gloss FROM "Gloss" WHERE "phraseId" = $1`,
            [request.data.phraseId]
        )
        const oldGloss = oldGlossQuery.rows[0]

        const result = await query(
            `INSERT INTO "Gloss" ("phraseId", state, gloss)
            VALUES ($1, $2, $3)
            ON CONFLICT ("phraseId") DO UPDATE SET
                state = COALESCE(EXCLUDED.state, "Gloss".state),
                gloss = COALESCE(EXCLUDED.gloss, "Gloss".gloss)
            `,
            [request.data.phraseId, request.data.state, request.data.gloss]
        )
        if (result.rowCount === 0) {
            notFound()
        }

        await query(
            `INSERT INTO "GlossEvent"
            ("phraseId", "userId", state, gloss, source)
            VALUES ($1, $2, $3, $4, 'USER')`,
            [
                request.data.phraseId,
                session.user.id,
                request.data.state !== oldGloss?.state ? request.data.state : undefined,
                request.data.gloss !== oldGloss?.gloss ? request.data.gloss : undefined,
            ]
        )
    })

    const pathQuery = await query<{ code: string, verseId: string }>(
        `SELECT l.code, w."verseId" FROM "Phrase" AS ph
        JOIN "Language" AS l ON l.id = ph."languageId"
        JOIN "PhraseWord" AS phw ON phw."phraseId" = ph.id
        JOIN "Word" AS w ON w.id = phw."wordId"
        WHERE ph.id = $1
        LIMIT 1`,
        [request.data.phraseId]
    )

    if (pathQuery.rows.length > 0) {
        const locale = await getLocale()
        revalidatePath(`/${locale}/interlinear/${pathQuery.rows[0].code}/${pathQuery.rows[0].code}`)
    }
}

const updateTranslatorNoteSchema = z.object({
    phraseId: z.coerce.number().int(),
    note: z.string()
})

export async function updateTranslatorNote(prevState: any, formData: FormData): Promise<any> {
    const session = await verifySession()
    if (!session?.user) {
        notFound()
    }

    const request = updateTranslatorNoteSchema.safeParse(parseForm(formData));
    if (!request.success) {
        return
    }

    const languageQuery = await query<{ roles: string[] }>(
        `SELECT 
            COALESCE(json_agg(r.role) FILTER (WHERE r.role IS NOT NULL), '[]') AS roles
        FROM "LanguageMemberRole" AS r
        WHERE r."languageId" = (SELECT "languageId" FROM "Phrase" WHERE id = $1) 
            AND r."userId" = $2`,
        [request.data.phraseId, session.user.id]
    )
    const language = languageQuery.rows[0]
    if (!language || (!session?.user.roles.includes('ADMIN') && !language.roles.includes('TRANSLATOR'))) {
        notFound()
    }

    const result = await query<{ state: string, gloss: string }>(
        `INSERT INTO "TranslatorNote" ("phraseId", "authorId", timestamp, content)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT ("phraseId") DO UPDATE SET
            "authorId" = EXCLUDED."authorId",
            timestamp = EXCLUDED.timestamp,
            content = EXCLUDED.content
        `,
        [request.data.phraseId, session.user.id, new Date(), request.data.note]
    )
    if (result.rowCount === 0) {
        notFound()
    }

    const pathQuery = await query<{ code: string, verseId: string }>(
        `SELECT l.code, w."verseId" FROM "Phrase" AS ph
        JOIN "Language" AS l ON l.id = ph."languageId"
        JOIN "PhraseWord" AS phw ON phw."phraseId" = ph.id
        JOIN "Word" AS w ON w.id = phw."wordId"
        WHERE ph.id = $1
        LIMIT 1`,
        [request.data.phraseId]
    )

    if (pathQuery.rows.length > 0) {
        const locale = await getLocale()
        revalidatePath(`/${locale}/interlinear/${pathQuery.rows[0].code}/${pathQuery.rows[0].code}`)
    }
}

const updateFootnoteSchema = z.object({
    phraseId: z.coerce.number().int(),
    note: z.string()
})

export async function updateFootnote(prevState: any, formData: FormData): Promise<any> {
    const session = await verifySession()
    if (!session?.user) {
        notFound()
    }

    const request = updateFootnoteSchema.safeParse(parseForm(formData));
    if (!request.success) {
        return
    }

    const languageQuery = await query<{ roles: string[] }>(
        `SELECT 
            COALESCE(json_agg(r.role) FILTER (WHERE r.role IS NOT NULL), '[]') AS roles
        FROM "LanguageMemberRole" AS r
        WHERE r."languageId" = (SELECT "languageId" FROM "Phrase" WHERE id = $1) 
            AND r."userId" = $2`,
        [request.data.phraseId, session.user.id]
    )
    const language = languageQuery.rows[0]
    if (!language || (!session?.user.roles.includes('ADMIN') && !language.roles.includes('TRANSLATOR'))) {
        notFound()
    }

    const result = await query<{ state: string, gloss: string }>(
        `INSERT INTO "Footnote" ("phraseId", "authorId", timestamp, content)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT ("phraseId") DO UPDATE SET
            "authorId" = EXCLUDED."authorId",
            timestamp = EXCLUDED.timestamp,
            content = EXCLUDED.content
        `,
        [request.data.phraseId, session.user.id, new Date(), request.data.note]
    )
    if (result.rowCount === 0) {
        notFound()
    }

    const pathQuery = await query<{ code: string, verseId: string }>(
        `SELECT l.code, w."verseId" FROM "Phrase" AS ph
        JOIN "Language" AS l ON l.id = ph."languageId"
        JOIN "PhraseWord" AS phw ON phw."phraseId" = ph.id
        JOIN "Word" AS w ON w.id = phw."wordId"
        WHERE ph.id = $1
        LIMIT 1`,
        [request.data.phraseId]
    )

    if (pathQuery.rows.length > 0) {
        const locale = await getLocale()
        revalidatePath(`/${locale}/interlinear/${pathQuery.rows[0].code}/${pathQuery.rows[0].code}`)
    }
}

const loadVersesPreviewSchema = z.object({
    verseIds: z.array(z.string()),
    code: z.string()
})

type VersesPreviewState = {
    state: 'success'
    verses: { id: string, original: string, translation: string }[]
} | {
    state: 'error',
    error: string
} | { state: 'initial' }

const bibleClient = new BibleClient()

export async function loadVersesPreview(_: VersesPreviewState, formData: FormData): Promise<VersesPreviewState> {
    const request = loadVersesPreviewSchema.safeParse(parseForm(formData));
    if (!request.success) {
        return { state: 'error', error: request.error.toString() }
    }

    const languageQuery = await query<{ bibleTranslationIds: string[] }>(
        `
        SELECT "bibleTranslationIds" FROM "Language" WHERE code = $1
        `,
        [request.data.code]
    )
    const language = languageQuery.rows[0]
    if (!language) {
        notFound()
    }

    const verseQuery = await query<{ id: string, text: string }>(
        `
        SELECT
            w."verseId" AS id,
            STRING_AGG(w."text", ' ' ORDER BY w.id) AS text
        FROM "Word" AS w
        WHERE w."verseId" = ANY($1::text[])
        GROUP BY w."verseId"
        `,
        [request.data.verseIds]
    )


    const translations = await Promise.all(request.data.verseIds.map(async verseId => {
        const { bookId, chapterNumber, verseNumber } = parseVerseId(verseId);
        const bookKey = bookKeys[bookId - 1].toLowerCase();
        const collection = await bibleClient.fetch_collection();
        for (const translationId of language.bibleTranslationIds) {
            try {
                const book = await collection.fetch_book(translationId, bookKey, 'txt');
                const text = book.get_verse(chapterNumber, verseNumber, {
                    attribute: false,
                    verse_nums: false,
                    headings: false,
                    notes: false,
                });
                return { verseId, text }
            } catch (e) {
                console.log(e);
                // There was some issue getting the verse in this translation, try the
                // next translation.
                continue;
            }
        }
        // Must return null, not undefined, so that this will work with useQuery
        return { verseId, text: '' };
    }))


    return {
        state: 'success',
        verses: request.data.verseIds.map(verseId => ({ id: verseId, original: verseQuery.rows.find(v => v.id === verseId)?.text ?? '', translation: translations.find(t => t.verseId === verseId)?.text ?? '' }))
    }
}

