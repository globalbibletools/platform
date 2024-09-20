"use server";

import * as z from 'zod';
import {getTranslations } from 'next-intl/server';
import { transaction } from '@/shared/db';
import { parseForm } from '@/app/form-parser';
import { verifySession } from '@/app/session';
import { notFound } from 'next/navigation';
import { FormState } from '@/app/components/Form';

const requestSchema = z.object({
    user_id: z.string().min(1),
    roles: z.array(z.string()).optional().default([]),
})

export async function changeUserRole(_prevState: FormState, formData: FormData): Promise<FormState> {
    const t = await getTranslations('AdminUsersPage');

    const session = await verifySession()
    if (!session?.user.roles.includes('ADMIN')) {
        notFound()
    }

    const request = requestSchema.safeParse(parseForm(formData));
    if (!request.success) {
        return {
            state: 'error',
            error: t('errors.invalid_request')
        }
    }

    await transaction(async query => {
        await query(
            `DELETE FROM "UserSystemRole" AS r WHERE r."userId" = $1 AND r.role != ALL($2::"SystemRole"[])`,
            [request.data.user_id, request.data.roles]
        )

        if (request.data.roles && request.data.roles.length > 0) {
            await query(`
                INSERT INTO "UserSystemRole" ("userId", "role")
                SELECT $1, UNNEST($2::"SystemRole"[])
                ON CONFLICT DO NOTHING`,
                [request.data.user_id, request.data.roles]
            )
        }
    })

    return { state: 'success' }
}


