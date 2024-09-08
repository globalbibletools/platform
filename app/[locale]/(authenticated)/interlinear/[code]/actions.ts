"use server";

import * as z from 'zod';
import {getLocale, getTranslations } from 'next-intl/server';
import { parseForm } from '@/app/form-parser';
import { redirect } from 'next/navigation';
import { parseReference } from './verse-utils';
import { query } from '@/app/db';

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


