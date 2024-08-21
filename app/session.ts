"use server";

import { query } from "@/app/db";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";

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
        await query(`INSERT INTO "Session" (id, "expiresAt", "userId") VALUES ($1, $2, $3)`, [session.id, session.expiresAt, session.userId])
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

    await query(`DELETE FROM "Session" WHERE id = $1`, [sessionId])
    cookies().delete('session')
}

export async function verifySession() {
    const sessionId = cookies().get('session')?.value
    if (!sessionId) return

    const result = await query<{ id: string, expiresAt: Date, user: { id: string, name: string, email: string }}>(
        `SELECT
            "Session".id, "expiresAt",
            JSON_BUILD_OBJECT('id', "User".id, 'email', email, 'name', name) AS user
        FROM "Session"
        JOIN "User" ON "User".id = "Session"."userId"
        WHERE "Session".id = $1`,
        [sessionId]
    )
    const session = result.rows[0]
    if (!session || session.expiresAt < new Date()) return
    return session
}
