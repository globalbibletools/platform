"use server";

import * as z from 'zod';
import {getTranslations, getLocale} from 'next-intl/server';
import { Scrypt } from "oslo/password";
import { createSession } from '@/app/session';
import { redirect } from 'next/navigation';
import { query } from '@/shared/db';
import { FormState } from '@/app/components/Form';
import homeRedirect from '@/app/home-redirect';

const scrypt = new Scrypt()

const loginSchema = z.object({
    email: z.string().min(1),
    password: z.string().min(1)
})

export async function login(_state: FormState, formData: FormData): Promise<FormState> {
    const t = await getTranslations('LoginPage');

    const request = loginSchema.safeParse({
        email: formData.get('email'),
        password: formData.get('password')
    }, {
        errorMap: (error) => {
            if (error.path.toString() === 'email') {
                return { message: t('errors.email_required') }
            } else if (error.path.toString() === 'password') {
                return { message: t('errors.password_required') }
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

    const result = await query<{ id: string, hashedPassword: string }>(`SELECT id, "hashedPassword" FROM "User" WHERE email = $1`, [request.data.email.toLowerCase()])
    const user = result.rows[0];

    if (!user) {
        return {
            state: 'error',
            error: 'Invalid email or password.'
        }
    }

    const valid = await scrypt.verify(user.hashedPassword, request.data.password)
    if (!valid) {
        return {
            state: 'error',
            error: 'Invalid email or password.'
        }
    }

    await createSession(user.id)

    const locale = await getLocale()
    redirect(await homeRedirect())
}
