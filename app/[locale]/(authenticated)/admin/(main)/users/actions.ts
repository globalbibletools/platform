"use server";

import * as z from 'zod';
import {getTranslations } from 'next-intl/server';
import { query } from '@/app/db';

const requestSchema = z.object({
    userId: z.string().min(1),
    roles: z.array(z.string().min(1)),
})

export interface ChangeUserRoleState {
    roles: string[]
    message?: string
}

export async function changeUserRole(prevState: ChangeUserRoleState, formData: FormData): Promise<ChangeUserRoleState> {
    const t = await getTranslations('AdminUsersPage');

    const request = requestSchema.safeParse({
        userId: formData.get('user_id'),
        roles: formData.get('roles')?.toString().split(',').filter(role => role !== ''),
    });
    if (!request.success) {
        return {
            roles: prevState.roles,
            message: t('errors.invalid_request')
        }
    }

    if (request.data.roles.length > 0) {
        await query(
            `WITH _ AS (DELETE FROM "UserSystemRole" AS r WHERE r."userId" = $1)
            INSERT INTO "UserSystemRole" ("userId", "role")
            SELECT $1, UNNEST($2::"SystemRole"[])
            `,
            [request.data.userId, request.data.roles]
        )
    } else {
        await query(
            `DELETE FROM "UserSystemRole" AS r WHERE r."userId" = $1`,
            [request.data.userId]
        )
    }

    return { roles: request.data.roles }
}


