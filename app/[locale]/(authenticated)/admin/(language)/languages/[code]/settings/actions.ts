"use server";

import * as z from 'zod';
import {getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { query } from '@/shared/db';
import { verifySession } from '@/app/session';
import { FormState } from '@/app/components/Form';

const requestSchema = z.object({
    code: z.string(),
    name: z.string().min(1),
    font: z.string().min(1),
    textDirection: z.string(),
    bibleTranslationIds: z.array(z.string()).optional()
})

export async function updateLanguageSettings(_prevState: FormState, formData: FormData): Promise<FormState> {
    const t = await getTranslations('LanguageSettingsPage');

    const session = await verifySession()
    if (!session) {
        notFound()
    }

    const request = requestSchema.safeParse({
        code: formData.get('code'),
        name: formData.get('name'),
        font: formData.get('font'),
        textDirection: formData.get('text_direction'),
        bibleTranslationIds: formData.get('bible_translations')?.toString().split(',').filter(id => id !== '')
    }, {
        errorMap: (error) => {
            if (error.path.toString() === 'name') {
                return { message: t('errors.name_required') }
            } else if (error.path.toString() === 'font') {
                return { message: t('errors.font_required') }
            } else if (error.path.toString() === 'textDirection') {
                return { message: t('errors.text_direction_required') }
            } else {
                return { message: 'Invalid' }
            }
        }
    });
    if (!request.success) {
        return {
            state: 'error',
            validation: request.error.flatten().fieldErrors
        }
    }

    const languageQuery = await query<{ roles: string[] }>(
        `SELECT 
            (SELECT COALESCE(json_agg(r.role) FILTER (WHERE r.role IS NOT NULL), '[]') AS roles
            FROM "LanguageMemberRole" AS r WHERE r."languageId" = l.id AND r."userId" = $2)
        FROM "Language" AS l WHERE l.code = $1`,
        [request.data.code, session.user.id]
    )
    const language = languageQuery.rows[0]

    if (!language || (!session?.user.roles.includes('ADMIN') && !language.roles.includes('ADMIN'))) {
        notFound()
    }

    await query(
        `UPDATE "Language"
            SET name = $2,
                font = $3,
                "textDirection" = $4,
                "bibleTranslationIds" = $5::text[]
        WHERE code = $1`,
        [request.data.code, request.data.name, request.data.font, request.data.textDirection, request.data.bibleTranslationIds ?? []]
    )

    return { state: 'success' }
}

