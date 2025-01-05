"use server";

import * as z from 'zod';
import { getTranslations, getLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { query } from '@/app/db';
import { parseForm } from '@/app/form-parser';
import { randomBytes } from 'crypto';
import mailer from '@/app/mailer';
import { FormState } from '@/app/components/Form';

const EXPIRATION = 60 * 60 * 1000 // 1 hr

const loginSchema = z.object({
    email: z.string().min(1)
})

export async function forgotPassword(_prevState: FormState, formData: FormData): Promise<FormState> {
    const t = await getTranslations('ForgotPasswordPage');

    const request = loginSchema.safeParse(parseForm(formData), {
        errorMap: (error) => {
            if (error.path.toString() === 'email') {
                return { message: t('errors.email_required') }
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

    const token = randomBytes(12).toString('hex')
    const result = await query(
        `
            INSERT INTO reset_password_token (user_id, token, expires)
            SELECT id, $2, $3 FROM users WHERE email = $1
        `,
        [request.data.email.toLowerCase(), token, Date.now() + EXPIRATION]
    )

    if ((result.rowCount ?? 0) > 0) {
        const url = `${process.env.ORIGIN}/reset-password?token=${token}`
        await mailer.sendEmail({
            email: request.data.email,
            subject: 'Reset Password',
            text: `Please click the following link to reset your password\n\n${url}`,
            html: `<a href="${url}">Click here</a> to reset your password`,
        });
    }

    const locale = await getLocale()
    redirect(`/${locale}/login`)
}
