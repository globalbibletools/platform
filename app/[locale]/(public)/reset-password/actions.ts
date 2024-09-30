"use server";

import * as z from 'zod';
import { getTranslations, getLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { query } from '@/shared/db';
import { parseForm } from '@/app/form-parser';
import mailer from '@/app/mailer';
import { Scrypt } from 'oslo/password';
import { createSession } from '@/app/session';
import { FormState } from '@/app/components/Form';

const scrypt = new Scrypt()

const resetPasswordSchema = z.object({
    token: z.string(),
    password: z.string().min(1),
    confirm_password: z.string().min(1)
}).refine(data => data.password === data.confirm_password, { path: ['confirm_password'] })

export async function resetPassword(_prevState: FormState, formData: FormData): Promise<FormState> {
    const t = await getTranslations('ResetPasswordPage');

    const request = resetPasswordSchema.safeParse(parseForm(formData), {
        errorMap: (error) => {
            if (error.path.toString() === 'password') {
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

    const hashedPassword = await scrypt.hash(request.data.password)
    const result = await query<{ id: string }>(
        `
            UPDATE "User" AS u SET
               "hashedPassword" = $2
            FROM "ResetPasswordToken" AS t
            WHERE u.id = t."userId"
                AND t.token = $1
                AND t.expires > (EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::bigint * 1000::bigint)
            RETURNING id
        `,
        [request.data.token, hashedPassword]
    )

    const user = result.rows[0]
    if (!user) {
        notFound()
    }

    await Promise.all([
        query(
            `DELETE FROM "ResetPasswordToken" WHERE token = $1`,
            [request.data.token]
        ),
        mailer.sendEmail({
            userId: user.id,
            subject: 'Password Changed',
            text: `Your password for Global Bible Tools has changed.`,
            html: `Your password for Global Bible Tools has changed.`,
        }),
        createSession(user.id)
    ]);

    const locale = await getLocale()
    redirect(`/${locale}/translate`)
}
