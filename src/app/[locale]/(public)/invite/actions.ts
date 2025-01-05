"use server";

import * as z from 'zod';
import {getTranslations, getLocale} from 'next-intl/server';
import { Scrypt } from "oslo/password";
import { createSession } from '@/session';
import { notFound, redirect } from 'next/navigation';
import { transaction } from '@/db';
import { parseForm } from '@/form-parser';
import { FormState } from '@/components/Form';
import homeRedirect from '@/home-redirect';

const scrypt = new Scrypt()

const loginSchema = z.object({
    token: z.string(),
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    password: z.string().min(1),
    confirm_password: z.string().min(1)
}).refine(data => data.password === data.confirm_password, { path: ['confirm_password'] })

export async function acceptInvite(prevState: FormState, formData: FormData): Promise<FormState> {
    const t = await getTranslations('AcceptInvitePage');
    const locale = await getLocale()

    const request = loginSchema.safeParse(parseForm(formData), {
        errorMap: (error) => {
            if (error.path.toString() === 'email') {
                if (error.code === 'invalid_string') {
                    return { message: t('errors.email_format') }
                } else {
                    return { message: t('errors.email_required') }
                }
            } else if (error.path.toString() === 'password') {
                if (error.code === 'too_small') {
                    return { message: t('errors.password_format') }
                } else {
                    return { message: t('errors.password_required') }
                }
            } else if (error.path.toString() === 'confirm_password') {
                if (error.code === 'custom') {
                    return { message: t('errors.confirm_password_mismatch') }
                } else {
                    return { message: t('errors.confirm_password_required') }
                }
            } else if (error.path.toString() === 'first_name') {
                return { message: t('errors.first_name_required') }
            } else if (error.path.toString() === 'last_name') {
                return { message: t('errors.last_name_required') }
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

    const userId = await transaction(async query => {
        const updatedUserQuery = await query<{ id: string }> (
            `UPDATE users AS u
                SET name = $2,
                    hashed_password = $3,
                    email_status = 'VERIFIED'
            WHERE u.id = (SELECT user_id FROM user_invitation WHERE token = $1)
            RETURNING id
            `,
            [request.data.token, `${request.data.first_name} ${request.data.last_name}`, await scrypt.hash(request.data.password)]
        )

        const userId = updatedUserQuery.rows[0]?.id
        if (!userId) {
            notFound()
        }

        await query(
            `DELETE FROM user_invitation WHERE user_id = $1`,
            [userId]
        )

        return userId
    })

    await createSession(userId)
    redirect(await homeRedirect())
}
