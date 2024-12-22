"use server";

import * as z from 'zod';
import { getTranslations, getLocale } from 'next-intl/server';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { query } from '@/shared/db';
import { FormState } from '@/app/components/Form';
import { parseForm } from '@/app/form-parser';
import { verifySession } from '@/app/session';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

const importSchema = z.object({
    code: z.string(),
    language: z.string(),
})

export async function importLanguage(_state: FormState, formData: FormData): Promise<FormState> {
    const t = await getTranslations('LanguageImportPage');
    const locale = await getLocale();

    const session = await verifySession()
    if (!session) redirect(`${locale}/login`)

    const request = importSchema.safeParse(parseForm(formData), {
        errorMap: (error) => {
            if (error.path.toString() === 'language') {
                return { message: t('errors.language_required') }
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

    const languageQuery = await query<{ id: string, roles: string[] }>(
        `SELECT 
            l.id,
            (SELECT COALESCE(json_agg(r.role) FILTER (WHERE r.role IS NOT NULL), '[]') AS roles
            FROM "LanguageMemberRole" AS r WHERE r."languageId" = l.id AND r."userId" = $2)
        FROM language AS l WHERE l.code = $1`,
        [request.data.code, session.user.id]
    )
    const language = languageQuery.rows[0]
    if (!language || (!session?.user.roles.includes('ADMIN') && !language.roles.includes('ADMIN'))) {
        notFound()
    }

    const result = await query(
        `
        INSERT INTO "LanguageImportJob" AS job ("languageId", "startDate", "userId")
        VALUES ($1, NOW(), $2)
        ON CONFLICT ("languageId") DO UPDATE SET
            "startDate" = NOW(),
            "endDate" = NULL,
            succeeded = NULL,
            "userId" = $2
        WHERE job.succeeded IS NOT NULL
        `,
        [language.id, session.user.id]
    )

    if ((result.rowCount ?? 0) > 0) {
        if (process.env.NODE_ENV === 'production') {
            const sqsClient = new SQSClient({
                credentials: {
                    accessKeyId: process.env.ACCESS_KEY_ID ?? '',
                    secretAccessKey: process.env.SECRET_ACCESS_KEY ?? '',
                },
            });
            await sqsClient.send(
                new SendMessageCommand({
                    QueueUrl: process.env.LANGUAGE_IMPORT_QUEUE_URL,
                    MessageGroupId: request.data.code,
                    MessageBody: JSON.stringify({
                        languageCode: request.data.code,
                        importLanguage: request.data.language,
                    }),
                })
            );
        } else {
            console.log(`Importing ${request.data.language} to ${request.data.code}`)
        }
    }

    revalidatePath(`/${locale}/admin/languages/${request.data.code}/import`)

    return { state: 'success' }
}

const resetImportSchema = z.object({
    code: z.string(),
})

export async function resetImport(formData: FormData): Promise<void> {
    const locale = await getLocale();

    const session = await verifySession()
    if (!session) redirect(`${locale}/login`)

    const request = resetImportSchema.safeParse(parseForm(formData));
    if (!request.success) {
        throw new Error('malformed request')
    }

    const languageQuery = await query<{ id: string, roles: string[] }>(
        `SELECT 
            l.id,
            (SELECT COALESCE(json_agg(r.role) FILTER (WHERE r.role IS NOT NULL), '[]') AS roles
            FROM "LanguageMemberRole" AS r WHERE r."languageId" = l.id AND r."userId" = $2)
        FROM language AS l WHERE l.code = $1`,
        [request.data.code, session.user.id]
    )
    const language = languageQuery.rows[0]
    if (!language || (!session?.user.roles.includes('ADMIN') && !language.roles.includes('ADMIN'))) {
        notFound()
    }

    await query(
        `
        DELETE FROM "LanguageImportJob"
        WHERE "languageId" = $1
        `,
        [language.id]
    )

    revalidatePath(`/${locale}/admin/languages/${request.data.code}/import`)
}
