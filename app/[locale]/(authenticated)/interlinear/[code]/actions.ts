"use server";

import * as z from 'zod';
import { getLocale, getTranslations } from 'next-intl/server';
import { parseForm } from '@/app/form-parser';
import { notFound, redirect } from 'next/navigation';
import { parseReference } from './verse-utils';
import { query, transaction } from '@/app/db';
import { verifySession } from '@/app/session';

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

    redirect(`/${locale}/interlinear/${request.data.language}/${verseId}`)
}

const redirectToUnapprovedSchema = z.object({
    code: z.string(),
    verseId: z.string()
})

export async function redirectToUnapproved(formData: FormData): Promise<void> {
    const request = redirectToUnapprovedSchema.safeParse(parseForm(formData));
    if (!request.success) {
        return
    }

    const result = await query<{ nextUnapprovedVerseId: string }>(
        `
        SELECT w."verseId" as "nextUnapprovedVerseId"
        FROM "Word" AS w
        LEFT JOIN LATERAL (
          SELECT g.state AS state FROM "PhraseWord" AS phw
          JOIN "Phrase" AS ph ON ph.id = phw."phraseId"
          LEFT JOIN "Gloss" AS g ON g."phraseId" = ph.id
          WHERE phw."wordId" = w.id
			      AND ph."languageId" = (SELECT id FROM "Language" WHERE code = $1)
			      AND ph."deletedAt" IS NULL
        ) AS g ON true
        WHERE w."verseId" > $2
          AND (g."state" = 'UNAPPROVED' OR g."state" IS NULL)
        ORDER BY w."id"
        LIMIT 1
        `,
        [request.data.code, request.data.verseId]
    )

    const locale = await getLocale();
    redirect(`/${locale}/interlinear/${request.data.code}/${result.rows[0].nextUnapprovedVerseId}`)
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
        WHERE r."languageId" = (SELECT id FROM "Language" WHERE code = $1) 
            AND r."userId" = $2`,
        [request.data.code, session.user.id]
    )
    const language = languageQuery.rows[0]
    if (!language || (!session?.user.roles.includes('ADMIN') && !language.roles.includes('TRANSLATOR'))) {
        notFound()
    }

    await transaction(async query => {
        const prevGlosses = await query<{ id: number, gloss: string, state: string }>(
            `
            SELECT ph.id, g.gloss, g.state FROM "Phrase" AS ph
            JOIN "Gloss" AS g ON g."phraseId" = ph.id
            WHERE ph.id = ANY($2::int[])
                AND ph."languageId" = (SELECT id FROM "Language" WHERE code = $1)
                AND ph."deletedAt" IS NULL
            `,
            [request.data.code, request.data.phrases.map(ph => ph.id)]
        )

        const updatedGlosses = await query<{ phraseId: number; gloss: string, state: string }>(
            `
            INSERT INTO "Gloss"("phraseId", "gloss", "state")
            SELECT ph.id, data.gloss, 'APPROVED'
            FROM UNNEST($1::integer[], $2::text[]) data (phrase_id, gloss)
            JOIN "Phrase" AS ph ON ph.id = data.phrase_id
            WHERE ph."deletedAt" IS NULL
            ON CONFLICT ("phraseId")
                DO UPDATE SET
                    "gloss" = COALESCE(EXCLUDED."gloss", "Gloss"."gloss"),
                    "state" = 'APPROVED'
            RETURNING *
            `,
            [request.data.phrases.map(ph => ph.id), request.data.phrases.map(ph => ph.gloss)]
        )

        const events = updatedGlosses.rows.map(g => {
            const oldGloss = prevGlosses.rows.find(g2 => g2.id === g.phraseId)
            return {
                id: g.phraseId,
                gloss: g.gloss !== oldGloss?.gloss ? g.gloss : undefined,
                state: oldGloss?.state !== 'APPROVED' ? 'APPROVED' : undefined
            }
        }).filter(event => event.gloss || event.state)

        await query(
            `
            INSERT INTO "GlossEvent" ("phraseId", "userId", "gloss", "state", "source")
            SELECT data.phrase_id, $1, data.gloss, data.state, 'USER'
            FROM UNNEST($2::integer[], $3::text[], $4::"GlossState"[]) data (phrase_id, gloss, state)
            `,
            [
                session.user.id,
                events.map(e => e.id),
                events.map(e => e.gloss),
                events.map(e => e.state)
            ]
        )
    })
}
