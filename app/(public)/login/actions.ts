"use server";

import * as z from 'zod';
import { Scrypt } from "oslo/password";
import { createSession } from '@/app/session';
import { redirect } from 'next/navigation';
import { query } from '@/app/db';

const scrypt = new Scrypt()

const loginSchema = z.object({
    email: z.string().min(1),
    password: z.string().min(1)
})

export interface LoginState {
    message?: string
    errors?: {
        email?: string[],
        password?: string[]
    }
}

export async function login(prevState: LoginState, formData: FormData): Promise<LoginState> {
    const request = loginSchema.safeParse({
        email: formData.get('email'),
        password: formData.get('password')
    });
    if (!request.success) {
        return {
            errors: request.error.flatten().fieldErrors
        }
    }

    const result = await query<{ id: string, hashedPassword: string }>(`SELECT id, "hashedPassword" FROM "User" WHERE email = $1`, [request.data.email.toLowerCase()])
    const user = result.rows[0];

    if (!user) {
        return {
            message: 'Invalid email or password.'
        }
    }

    const valid = await scrypt.verify(user.hashedPassword, request.data.password)
    if (!valid) {
        return {
            message: 'Invalid email or password.'
        }
    }

    await createSession(user.id)
    redirect('/')
}
