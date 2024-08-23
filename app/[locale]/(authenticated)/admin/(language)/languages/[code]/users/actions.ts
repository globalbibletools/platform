"use server";

import * as z from 'zod';
import {getTranslations } from 'next-intl/server';
import { transaction } from '@/app/db';
import { parseForm } from '@/app/form-parser';

const requestSchema = z.object({
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

    const request = requestSchema.safeParse(parseForm(formData));
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


