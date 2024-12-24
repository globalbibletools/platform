"use server";

import { query } from "@gbt/db/query";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { cache } from "react";

const DAY_FROM_MS = 24 * 60 * 60 * 1000
const EXPIRES_IN = DAY_FROM_MS * (process.env.SESSION_EXPIRATION_DAYS ? parseInt(process.env.SESSION_EXPIRATION_DAYS) : 30)
if (Number.isNaN(EXPIRES_IN)) {
    throw new Error('SESSION_EXPIRATION_DAYS env var must be a number')
}

export async function createSession(userId?: string) {
    await clearSession()

    const session = {
        id: randomBytes(16).toString('hex'),
        expiresAt: new Date(Date.now() + EXPIRES_IN),
        userId
    }
    if (userId) {
        await query(`INSERT INTO session (id, expires_at, user_id) VALUES ($1, $2, $3)`, [session.id, session.expiresAt, session.userId])
    }

    cookies().set('session', session.id, {
        httpOnly: true,
        secure: true,
        expires: session.expiresAt,
        sameSite: 'lax',
        path: '/',
    })

    return session
}

export async function clearSession() {
    const sessionId = cookies().get('session')?.value
    if (!sessionId) return

    cookies().delete('session')
}

export async function verifySession() {
    const sessionId = cookies().get('session')?.value
    if (!sessionId) return

    const session = await fetchSession(sessionId)
    if (!session || session.expiresAt < new Date()) {
        return
    }

    return session
}

interface Session {
    id: string,
    expiresAt: Date,
    user: {
        id: string,
        name: string,
        email: string,
        roles: string[]
    }
}

const fetchSession = cache(async (sessionId: string): Promise<Session | undefined> => {
    const result = await query<Session>(
        `
            SELECT
                session.id, expires_at,
                JSON_BUILD_OBJECT(
                    'id', users.id, 'email', email, 'name', name,
                    'roles', (SELECT COALESCE(json_agg(r.role) FILTER (WHERE r.role IS NOT NULL), '[]') FROM user_system_role AS r WHERE r.user_id = users.id)
                ) AS user
            FROM session
            JOIN users ON users.id = session.user_id
            WHERE session.id = $1
            `,
        [sessionId]
    )
    return result.rows[0]
})
