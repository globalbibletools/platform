"use server";

import * as z from 'zod';
import {getLocale, getTranslations } from 'next-intl/server';
import { query, transaction } from '@/app/db';
import { parseForm } from '@/app/form-parser';
import { revalidatePath } from 'next/cache';

const changeUserRequestSchema = z.object({
    code: z.string(),
    user_id: z.string(),
    roles: z.array(z.string()).optional().default([]),
})

export interface ChangeUserRoleState {
    roles: string[]
    message?: string
}

export async function changeUserLanguageRole(prevState: ChangeUserRoleState, formData: FormData): Promise<ChangeUserRoleState> {
    const t = await getTranslations('AdminUsersPage');

    const request = changeUserRequestSchema.safeParse(parseForm(formData));
    if (!request.success) {
        return {
            roles: prevState.roles,
            message: t('errors.invalid_request')
        }
    }

    await transaction(async query => {
        await query(
            `DELETE FROM "LanguageMemberRole" AS r
            WHERE r."languageId" = (SELECT id FROM "Language" WHERE code = $1) AND r."userId" = $2 AND r.role != 'VIEWER' AND r.role != ALL($3::"LanguageRole"[])`,
            [request.data.code, request.data.user_id, request.data.roles]
        )

        if (request.data.roles && request.data.roles.length > 0) {
            await query(`
                INSERT INTO "LanguageMemberRole" ("languageId", "userId", "role")
                SELECT l.id, $2, UNNEST($3::"LanguageRole"[])
                FROM "Language" AS l
                WHERE l.code = $1
                ON CONFLICT DO NOTHING`,
                [request.data.code, request.data.user_id, request.data.roles]
            )
        }
    })

    return { roles: request.data.roles }
}

const removeUserRequestSchema = z.object({
    code: z.string(),
    user_id: z.string()
})

export interface RemoveLanguageUserState {
    message?: string
}

export async function removeLanguageUser(prevState: RemoveLanguageUserState, formData: FormData): Promise<RemoveLanguageUserState> {
    const t = await getTranslations('AdminUsersPage');
    const locale = await getLocale()

    const request = removeUserRequestSchema.safeParse(parseForm(formData));
    if (!request.success) {
        return {
            message: t('errors.invalid_request')
        }
    }

    await query(
        `DELETE FROM "LanguageMemberRole" WHERE "languageId" = (SELECT id FROM "Language" WHERE code = $1) AND "userId" = $2`,
        [request.data.code, request.data.user_id]
    )

    revalidatePath(`/${locale}/admin/languages/${request.data.code}/users`)

    return {}
}

