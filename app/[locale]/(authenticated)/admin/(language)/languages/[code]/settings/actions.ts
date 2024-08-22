"use server";

import * as z from 'zod';
import {getTranslations, getLocale} from 'next-intl/server';
import { redirect } from 'next/navigation';
import { query } from '@/app/db';

const requestSchema = z.object({
    code: z.string(),
    name: z.string().min(1),
    font: z.string().min(1),
    textDirection: z.string(),
    bibleTranslationIds: z.array(z.string()).optional()
})

export interface CreateLanguageState {
    message?: string
    errors?: {}
}

export async function updateLanguageSettings(prevState: CreateLanguageState, formData: FormData): Promise<CreateLanguageState> {
    const t = await getTranslations('LanguageSettingsPage');

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
            errors: request.error.flatten().fieldErrors
        }
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

    return {}
}

