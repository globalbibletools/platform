"use server";

import * as z from 'zod';
import { getTranslations, getLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { query } from '@/app/db';
import { randomBytes } from 'crypto';
import { verifySession } from '@/app/session';
import mailer from '@/app/mailer';

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

    const session = await verifySession()
    if (!session?.user.roles.includes('ADMIN')) {
        notFound()
    }

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

    const url = `${process.env.ORIGIN}/invite?token=${token}`
    await mailer.sendEmail({
        email: request.data.email,
        subject: 'GlobalBibleTools Invite',
        text: `You've been invited to globalbibletools.com. Click the following to accept your invite and get started.\n\n${url.toString()}`,
        html: `You've been invited to globalbibletools.com. <a href="${url.toString()}">Click here<a/> to accept your invite and get started.`,
    });


    redirect(`/${locale}/admin/users`)
}

