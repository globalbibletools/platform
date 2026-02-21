"use server";

import { query } from "@/db";
import { useSession } from "@tanstack/react-start/server";
import * as React from "react";

const DAY_FROM_MS = 24 * 60 * 60 * 1000;
const EXPIRES_IN =
  DAY_FROM_MS *
  (process.env.SESSION_EXPIRATION_DAYS ?
    parseInt(process.env.SESSION_EXPIRATION_DAYS)
  : 30);
if (Number.isNaN(EXPIRES_IN)) {
  throw new Error("SESSION_EXPIRATION_DAYS env var must be a number");
}

function useAppSession() {
  return useSession<{ userId: string }>({
    name: "session",
    password: "12345678123456781234567812345678",
    cookie: {
      expires: new Date(Date.now() + EXPIRES_IN),
      secure: process.env.NODE_ENV === "production",
    },
  });
}

export async function createSession(userId?: string) {
  const session = await useAppSession();
  await session.update({ userId });

  return session;
}

export async function clearSession() {
  const session = await useAppSession();
  session.clear();
}

export async function verifySession() {
  const session = await useAppSession();

  const { userId } = session.data;

  if (!userId) return;

  const sessionData = await fetchSession(userId);
  return sessionData;
}

interface Session {
  user: {
    id: string;
    name: string;
    email: string;
    roles: string[];
  };
}

const fetchSession = React.cache(
  async (userId: string): Promise<Session | undefined> => {
    const result = await query<Session>(
      `
        SELECT
          JSON_BUILD_OBJECT(
            'id', users.id, 'email', email, 'name', name,
            'roles', (SELECT COALESCE(json_agg(r.role) FILTER (WHERE r.role IS NOT NULL), '[]') FROM user_system_role AS r WHERE r.user_id = users.id)
          ) AS user
        FROM users
        WHERE users.id = $1
      `,
      [userId],
    );
    return result.rows[0];
  },
);
