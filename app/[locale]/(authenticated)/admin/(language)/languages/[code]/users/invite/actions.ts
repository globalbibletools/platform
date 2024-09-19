"use server";

import * as z from 'zod';
import { getTranslations, getLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { query } from '@/shared/db';
import { randomBytes } from 'crypto';
import { parseForm } from '@/app/form-parser';
import { verifySession } from '@/app/session';
import mailer from '@/app/mailer';
import { FormState } from '@/app/components/Form';

const requestSchema = z.object({
    code: z.string(),
    email: z.string().email().min(1),
    roles: z.array(z.string())
})

const INVITE_EXPIRES = 7 * 24 * 60 * 60 * 1000 // 7 days

export async function inviteUser(_prevState: FormState, formData: FormData): Promise<FormState> {
    const t = await getTranslations('InviteUserPage');
    const locale = await getLocale()

    const session = await verifySession()
    if (!session) {
        notFound()
    }

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
            state: 'error',
            validation: request.error.flatten().fieldErrors
        }
    }

    const languageQuery = await query<{ roles: string[] }>(
        `SELECT 
            (SELECT COALESCE(json_agg(r.role) FILTER (WHERE r.role IS NOT NULL), '[]') AS roles
            FROM "LanguageMemberRole" AS r WHERE r."languageId" = l.id AND r."userId" = $2)
        FROM "Language" AS l WHERE l.code = $1`,
        [request.data.code, session.user.id]
    )
    const language = languageQuery.rows[0]

    if (!language || (!session?.user.roles.includes('ADMIN') && !language.roles.includes('ADMIN'))) {
        notFound()
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

        const url = `${process.env.ORIGIN}/invite?token=${token}`
        await mailer.sendEmail({
            email: request.data.email,
            subject: 'GlobalBibleTools Invite',
            text: `You've been invited to globalbibletools.com. Click the following to accept your invite and get started.\n\n${url.toString()}`,
            html: `You've been invited to globalbibletools.com. <a href="${url.toString()}">Click here<a/> to accept your invite and get started.`,
        });
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

