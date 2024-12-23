"use server";

import * as z from 'zod';
import {getTranslations } from 'next-intl/server';
import { query, transaction } from '@/shared/db';
import { parseForm } from '@/app/form-parser';
import { verifySession } from '@/app/session';
import { notFound } from 'next/navigation';
import { FormState } from '@/app/components/Form';
import { randomBytes } from 'crypto';
import mailer from '@/app/mailer';

const requestSchema = z.object({
    userId: z.string().min(1),
    roles: z.array(z.string()).optional().default([]),
})

const INVITE_EXPIRES = 7 * 24 * 60 * 60 * 1000 // 7 days

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
            [request.data.userId, request.data.roles]
        )

        if (request.data.roles && request.data.roles.length > 0) {
            await query(`
                INSERT INTO "UserSystemRole" ("userId", "role")
                SELECT $1, UNNEST($2::"SystemRole"[])
                ON CONFLICT DO NOTHING`,
                [request.data.userId, request.data.roles]
            )
        }
    })

    return { state: 'success' }
}

const resendUserInviteSchema = z.object({
    userId: z.string().min(1)
})

export async function resendUserInvite(_prevState: FormState, formData: FormData): Promise<FormState> {
    const t = await getTranslations('AdminUsersPage');

    const session = await verifySession()
    if (!session) {
        notFound()
    }

    const request = resendUserInviteSchema.safeParse(parseForm(formData));
    if (!request.success) {
        return {
            state: 'error',
            error: t('errors.invalid_request')
        }
    }

    const accessQuery = await query<{ isLanguageAdmin: boolean }>(
        `
        SELECT
            COUNT(*) > 0 AS "isLanguageAdmin"
        FROM (
            SELECT DISTINCT(language_id) AS id FROM language_member_role
            WHERE user_id = $1
        ) AS lang
        JOIN language_member_role AS role ON role.language_id = lang.id
        WHERE role.user_id = $2
            AND role.role = 'ADMIN'
        `,
        [request.data.userId, session.user.id]
    )
    const access = accessQuery.rows[0] ?? { isLanguageAdmin: false }

    if (!session?.user.roles.includes('ADMIN') && !access.isLanguageAdmin) {
        notFound()
    }

    const userQuery = await query<{ email: string, isActive: boolean }>(
        `SELECT
            u.email,
            u.hashed_password IS NOT NULL AS "isActive"
        FROM users AS u
        WHERE u.id = $1`,
        [request.data.userId]
    )
    const user = userQuery.rows[0]
    if (!user) {
        notFound()
    } else if (user.isActive) {
        return {
            state: 'error',
            error: 'User has already signed up'
        }
    }
    
    const token = randomBytes(12).toString('hex')
    await query(
        `INSERT INTO "UserInvitation" ("userId", token, expires)
        VALUES ($1, $2, $3)
        `,
        [request.data.userId, token, Date.now() + INVITE_EXPIRES]
    )

    const url = `${process.env.ORIGIN}/invite?token=${token}`
    await mailer.sendEmail({
        email: user.email,
        subject: 'GlobalBibleTools Invite',
        text: `You've been invited to globalbibletools.com. Click the following to accept your invite and get started.\n\n${url.toString()}`,
        html: `You've been invited to globalbibletools.com. <a href="${url.toString()}">Click here<a/> to accept your invite and get started.`,
    });

    return { state: 'success', message: 'Invite sent successfully!' }
}

