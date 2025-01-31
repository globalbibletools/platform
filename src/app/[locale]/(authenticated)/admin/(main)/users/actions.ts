"use server";

import * as z from "zod";
import { getLocale, getTranslations } from "next-intl/server";
import { query } from "@/db";
import { parseForm } from "@/form-parser";
import { verifySession } from "@/session";
import { notFound } from "next/navigation";
import { FormState } from "@/components/Form";
import { randomBytes } from "crypto";
import mailer from "@/mailer";
import { revalidatePath } from "next/cache";
import { serverActionLogger } from "@/server-action";

const INVITE_EXPIRES = 7 * 24 * 60 * 60 * 1000; // 7 days

const resendUserInviteSchema = z.object({
  userId: z.string().min(1),
});

export async function resendUserInvite(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const logger = serverActionLogger("resendUserInvite");

  const t = await getTranslations("AdminUsersPage");

  const session = await verifySession();
  if (!session) {
    logger.error("unauthorized");
    notFound();
  }

  const request = resendUserInviteSchema.safeParse(parseForm(formData));
  if (!request.success) {
    logger.error("request parse error");
    return {
      state: "error",
      error: t("errors.invalid_request"),
    };
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
    [request.data.userId, session.user.id],
  );
  const access = accessQuery.rows[0] ?? { isLanguageAdmin: false };

  if (!session?.user.roles.includes("ADMIN") && !access.isLanguageAdmin) {
    logger.error("unauthorized");
    notFound();
  }

  const userQuery = await query<{ email: string; isActive: boolean }>(
    `SELECT
            u.email,
            u.hashed_password IS NOT NULL AS "isActive"
        FROM users AS u
        WHERE u.id = $1 AND status <> 'disabled'`,
    [request.data.userId],
  );
  const user = userQuery.rows[0];
  if (!user) {
    logger.error("user not found");
    notFound();
  } else if (user.isActive) {
    return {
      state: "error",
      error: "User has already signed up",
    };
  }

  const token = randomBytes(12).toString("hex");
  await query(
    `INSERT INTO user_invitation (user_id, token, expires)
        VALUES ($1, $2, $3)
        `,
    [request.data.userId, token, Date.now() + INVITE_EXPIRES],
  );

  const url = `${process.env.ORIGIN}/invite?token=${token}`;
  await mailer.sendEmail({
    email: user.email,
    subject: "GlobalBibleTools Invite",
    text: `You've been invited to globalbibletools.com. Click the following to accept your invite and get started.\n\n${url.toString()}`,
    html: `You've been invited to globalbibletools.com. <a href="${url.toString()}">Click here<a/> to accept your invite and get started.`,
  });

  return { state: "success", message: "Invite sent successfully!" };
}

const disableUserSchema = z.object({
  userId: z.string().min(1),
});

export async function disableUser(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const logger = serverActionLogger("disableUser");

  const t = await getTranslations("AdminUsersPage");

  const session = await verifySession();
  if (!session) {
    logger.error("unauthorized");
    notFound();
  }

  const request = disableUserSchema.safeParse(parseForm(formData));
  if (!request.success) {
    logger.error("request parse error");
    return {
      state: "error",
      error: t("errors.invalid_request"),
    };
  }

  if (!session?.user.roles.includes("ADMIN")) {
    logger.error("unauthorized");
    notFound();
  }

  await query(
    `
        WITH delete_lang_roles AS (
            DELETE FROM language_member_role
            WHERE user_id = $1
        ),
        delete_sys_roles AS (
            DELETE FROM user_system_role
            WHERE user_id = $1
        ),
        delete_sessions AS (
            DELETE FROM session
            WHERE user_id = $1
        ),
        delete_invites AS (
            DELETE FROM user_invitation
            WHERE user_id = $1
        ),
        delete_email_verifications AS (
            DELETE FROM user_email_verification
            WHERE user_id = $1
        ),
        delete_password_reset AS (
            DELETE FROM reset_password_token
            WHERE user_id = $1
        )
        UPDATE users
            SET status = 'disabled'
        WHERE id = $1
        `,
    [request.data.userId],
  );

  const locale = await getLocale();
  revalidatePath(`/${locale}/admin/users`);

  return { state: "success", message: "User disabled successfully" };
}
