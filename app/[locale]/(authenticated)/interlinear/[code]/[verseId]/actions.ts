"use server";

import * as z from 'zod';
import {getLocale, getTranslations } from 'next-intl/server';
import { parseForm } from '@/app/form-parser';
import { redirect } from 'next/navigation';
import { parseReference } from './verse-utils';

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



