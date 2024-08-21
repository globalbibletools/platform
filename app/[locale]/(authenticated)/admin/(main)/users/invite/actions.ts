"use server";

import * as z from 'zod';
import {getTranslations, getLocale} from 'next-intl/server';
import { redirect } from 'next/navigation';
import { query } from '@/app/db';
import { randomBytes } from 'crypto';

const requestSchema = z.object({
    email: z.string().email().min(1),
})

export interface InviteUserState {
    message?: string
    errors?: {
        email?: string[],
    }
}

const INVITE_EXPIRES = 7 * 24 * 60 * 60 * 1000 // 7 days

export async function inviteUser(prevState: InviteUserState, formData: FormData): Promise<InviteUserState> {
    const t = await getTranslations('InviteUserPage');
    const locale = await getLocale()

    const request = requestSchema.safeParse({
        email: formData.get('email'),
    }, {
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

    const existsQuery = await query(`SELECT FROM "User" WHERE email = $1`, [request.data.email])
    if (existsQuery.rows.length > 0) {
        return {
            message: t('errors.user_exists')
        }
    }

    const token = randomBytes(12).toString('hex')
    await query(
        `WITH new_user AS (
            INSERT INTO "User" (email) VALUES ($1) RETURNING id
        )
        INSERT INTO "UserInvitation" ("userId", token, expires)
        SELECT id, $2, $3 FROM new_user
        `,
        [request.data.email, token, Date.now() + INVITE_EXPIRES]
    )

    redirect(`/${locale}/admin/users`)
}

