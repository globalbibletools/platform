"use server";

import { query } from '@/shared/db';
import { parseForm } from '@/app/form-parser';
import { verifySession } from '@/app/session';
import { getLocale } from 'next-intl/server';
import { revalidatePath } from 'next/cache';
import { notFound } from 'next/navigation';
import * as z from 'zod';

const updateGlossSchema = z.object({
    phraseId: z.coerce.number().int(),
    state: z.enum(['APPROVED', 'UNAPPROVED']).optional(),
    gloss: z.string().optional()
})

export async function updateGloss(formData: FormData): Promise<any> {
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
        FROM language_member_role AS r
        WHERE r.language_id = (SELECT language_id FROM phrase WHERE id = $1) 
            AND r.user_id = $2`,
        [request.data.phraseId, session.user.id]
    )
    const language = languageQuery.rows[0]
    if (!language || (!session?.user.roles.includes('ADMIN') && !language.roles.includes('TRANSLATOR'))) {
        notFound()
    }

    await query(
        `INSERT INTO gloss (phrase_id, state, gloss, updated_at, updated_by, source)
        VALUES ($1, $2, $3, NOW(), $4, 'USER')
        ON CONFLICT (phrase_id) DO UPDATE SET
            state = COALESCE(EXCLUDED.state, gloss.state),
            gloss = COALESCE(EXCLUDED.gloss, gloss.gloss),
            updated_at = EXCLUDED.updated_at,
            updated_by = EXCLUDED.updated_by, 
            source = EXCLUDED.source
            WHERE EXCLUDED.state <> gloss.state OR EXCLUDED.gloss <> gloss.gloss
        `,
        [request.data.phraseId, request.data.state, request.data.gloss, session.user.id]
    )

    const pathQuery = await query<{ code: string, verseId: string }>(
        `SELECT l.code, w."verseId" FROM phrase AS ph
        JOIN language AS l ON l.id = ph.language_id
        JOIN "PhraseWord" AS phw ON phw."phraseId" = ph.id
        JOIN "Word" AS w ON w.id = phw."wordId"
        WHERE ph.id = $1
        LIMIT 1`,
        [request.data.phraseId]
    )

    if (pathQuery.rows.length > 0) {
        const locale = await getLocale()
        revalidatePath(`/${locale}/translate/${pathQuery.rows[0].code}/${pathQuery.rows[0].code}`)
    }
}

const updateTranslatorNoteSchema = z.object({
    phraseId: z.coerce.number().int(),
    note: z.string()
})

export async function updateTranslatorNote(formData: FormData): Promise<any> {
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
        FROM language_member_role AS r
        WHERE r.language_id = (SELECT id FROM language WHERE code = $1) 
            AND r.user_id = $2`,
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
        `SELECT l.code, w."verseId" FROM phrase AS ph
        JOIN language AS l ON l.id = ph.language_id
        JOIN "PhraseWord" AS phw ON phw."phraseId" = ph.id
        JOIN "Word" AS w ON w.id = phw."wordId"
        WHERE ph.id = $1
        LIMIT 1`,
        [request.data.phraseId]
    )

    if (pathQuery.rows.length > 0) {
        const locale = await getLocale()
        revalidatePath(`/${locale}/translate/${pathQuery.rows[0].code}/${pathQuery.rows[0].code}`)
    }
}

const updateFootnoteSchema = z.object({
    phraseId: z.coerce.number().int(),
    note: z.string()
})

export async function updateFootnote(formData: FormData): Promise<any> {
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
        FROM language_member_role AS r
        WHERE r.language_id = (SELECT id FROM language WHERE code = $1) 
            AND r.user_id = $2`,
        [request.data.phraseId, session.user.id]
    )
    const language = languageQuery.rows[0]
    if (!language || (!session?.user.roles.includes('ADMIN') && !language.roles.includes('TRANSLATOR'))) {
        notFound()
    }

    const result = await query<{ state: string, gloss: string }>(
        `INSERT INTO footnote (phrase_id, author_id, timestamp, content)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (phrase_id) DO UPDATE SET
            author_id = EXCLUDED.author_id,
            timestamp = EXCLUDED.timestamp,
            content = EXCLUDED.content
        `,
        [request.data.phraseId, session.user.id, new Date(), request.data.note]
    )
    if (result.rowCount === 0) {
        notFound()
    }

    const pathQuery = await query<{ code: string, verseId: string }>(
        `SELECT l.code, w."verseId" FROM phrase AS ph
        JOIN language AS l ON l.id = ph.language_id
        JOIN "PhraseWord" AS phw ON phw."phraseId" = ph.id
        JOIN "Word" AS w ON w.id = phw."wordId"
        WHERE ph.id = $1
        LIMIT 1`,
        [request.data.phraseId]
    )

    if (pathQuery.rows.length > 0) {
        const locale = await getLocale()
        revalidatePath(`/${locale}/translate/${pathQuery.rows[0].code}/${pathQuery.rows[0].code}`)
    }
}

