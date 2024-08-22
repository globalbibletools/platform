"use server";

import * as z from 'zod';
import {getTranslations, getLocale} from 'next-intl/server';
import { redirect } from 'next/navigation';
import { query } from '@/app/db';
import { randomBytes } from 'crypto';
import { parseForm } from '@/app/form-parser';

const requestSchema = z.object({
    code: z.string(),
    email: z.string().email().min(1),
    roles: z.array(z.string())
})

export interface InviteUserState {
    message?: string
    errors?: {
        email?: string[],
        roles?: string[]
    }
}

const INVITE_EXPIRES = 7 * 24 * 60 * 60 * 1000 // 7 days

export async function inviteUser(prevState: InviteUserState, formData: FormData): Promise<InviteUserState> {
    const t = await getTranslations('InviteUserPage');
    const locale = await getLocale()

    const request = requestSchema.safeParse(parseForm(formData), {
        errorMap: (error) => {
            if (error.path.toString() === 'email') {
                if (error.code === 'too_small') {
                    return { message: t('errors.email_required') }
                } else {
                    return { message: t('errors.email_format') }
                }
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

    const existsQuery = await query(`SELECT id FROM "User" WHERE email = $1`, [request.data.email])
    const existingUser = existsQuery.rows[0]

    const roles = [...request.data.roles, 'VIEWER']

    if (!existingUser) {
        const token = randomBytes(12).toString('hex')
        await query(
            `WITH new_user AS (
                INSERT INTO "User" (email) VALUES ($1) RETURNING id
            ),
            invite AS (
                INSERT INTO "UserInvitation" ("userId", token, expires)
                SELECT id, $2, $3 FROM new_user
            )
            INSERT INTO "LanguageMemberRole" ("languageId", "userId", "role")
            SELECT l.id, new_user.id, UNNEST($5::"LanguageRole"[]) FROM new_user
            JOIN "Language" AS l ON l.code = $4
            `,
            [request.data.email, token, Date.now() + INVITE_EXPIRES, request.data.code, roles]
        )
    } else {
        await query(
            `INSERT INTO "LanguageMemberRole" ("languageId", "userId", "role")
            SELECT l.id, $2, UNNEST($3::"LanguageRole"[]) FROM "Language" AS l
            WHERE l.code = $1
            ON CONFLICT DO NOTHING
            `,
            [request.data.code, existingUser.id, roles]
        )
    }

    redirect(`/${locale}/admin/languages/${request.data.code}/users`)
}

