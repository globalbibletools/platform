"use server";

import * as z from 'zod';
import {getLocale, getTranslations } from 'next-intl/server';
import { query, transaction } from '@/shared/db';
import { parseForm } from '@/app/form-parser';
import { revalidatePath } from 'next/cache';
import { verifySession } from '@/app/session';
import { notFound } from 'next/navigation';
import { FormState } from '@/app/components/Form';

const changeUserRequestSchema = z.object({
    code: z.string(),
    userId: z.string(),
    roles: z.array(z.string()).optional().default([]),
})

export async function changeUserLanguageRole(_prevState: FormState, formData: FormData): Promise<FormState> {
    const t = await getTranslations('AdminUsersPage');

    const session = await verifySession()
    if (!session) {
        notFound()
    }

    const request = changeUserRequestSchema.safeParse(parseForm(formData));
    if (!request.success) {
        return {
            state: 'error',
            error: t('errors.invalid_request')
        }
    }

    const languageQuery = await query<{ roles: string[] }>(
        `SELECT 
            (SELECT COALESCE(json_agg(r.role) FILTER (WHERE r.role IS NOT NULL), '[]') AS roles
            FROM "LanguageMemberRole" AS r WHERE r."languageId" = l.id AND r."userId" = $2)
        FROM language AS l WHERE l.code = $1`,
        [request.data.code, session.user.id]
    )
    const language = languageQuery.rows[0]

    if (!language || (!session?.user.roles.includes('ADMIN') && !language.roles.includes('ADMIN'))) {
        notFound()
    }

    await transaction(async query => {
        await query(
            `DELETE FROM "LanguageMemberRole" AS r
            WHERE r."languageId" = (SELECT id FROM language WHERE code = $1) AND r."userId" = $2 AND r.role != 'VIEWER' AND r.role != ALL($3::"LanguageRole"[])`,
            [request.data.code, request.data.userId, request.data.roles]
        )

        if (request.data.roles && request.data.roles.length > 0) {
            await query(`
                INSERT INTO "LanguageMemberRole" ("languageId", "userId", "role")
                SELECT l.id, $2, UNNEST($3::"LanguageRole"[])
                FROM language AS l
                WHERE l.code = $1
                ON CONFLICT DO NOTHING`,
                [request.data.code, request.data.userId, request.data.roles]
            )
        }
    })

    const locale = await getLocale()
    revalidatePath(`/${locale}/admin/languages/${request.data.code}/users`)

    return { state: 'success', message: 'User role updated' }
}

const removeUserRequestSchema = z.object({
    code: z.string(),
    userId: z.string()
})

export async function removeLanguageUser(_prevState: FormState, formData: FormData): Promise<FormState> {
    const t = await getTranslations('AdminUsersPage');

    const session = await verifySession()
    if (!session) {
        notFound()
    }

    const request = removeUserRequestSchema.safeParse(parseForm(formData));
    if (!request.success) {
        return {
            state: 'error',
            error: t('errors.invalid_request')
        }
    }

    const languageQuery = await query<{ roles: string[] }>(
        `SELECT 
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
        `DELETE FROM "LanguageMemberRole" WHERE "languageId" = (SELECT id FROM language WHERE code = $1) AND "userId" = $2`,
        [request.data.code, request.data.userId]
    )

    const locale = await getLocale()
    revalidatePath(`/${locale}/admin/languages/${request.data.code}/users`)

    return { state: 'success', message: 'User removed successfully.' }
}

