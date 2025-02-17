"use server";

import * as z from "zod";
import { getLocale, getTranslations } from "next-intl/server";
import { query, transaction } from "@/db";
import { parseForm } from "@/form-parser";
import { verifySession } from "@/session";
import { notFound } from "next/navigation";
import { FormState } from "@/components/Form";
import { revalidatePath } from "next/cache";
import { serverActionLogger } from "@/server-action";

const requestSchema = z.object({
  userId: z.string().min(1),
  roles: z.array(z.string()).optional().default([]),
});

export async function changeUserRole(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const logger = serverActionLogger("changeUserRole");

  const t = await getTranslations("AdminUsersPage");

  const session = await verifySession();
  if (!session?.user.roles.includes("ADMIN")) {
    logger.error("unauthorized");
    notFound();
  }

  const request = requestSchema.safeParse(parseForm(formData));
  if (!request.success) {
    logger.error("request parse error");
    return {
      state: "error",
      error: t("errors.invalid_request"),
    };
  }

  const usersQuery = await query<{ id: string }>(
    `SELECT id FROM users WHERE id = $1 AND status <> 'disabled'`,
    [request.data.userId],
  );
  if (usersQuery.rows.length === 0) {
    logger.error("user not found");
    notFound();
  }

  await transaction(async (query) => {
    await query(
      `DELETE FROM user_system_role AS r WHERE r.user_id = $1 AND r.role != ALL($2::system_role[])`,
      [request.data.userId, request.data.roles],
    );

    if (request.data.roles && request.data.roles.length > 0) {
      await query(
        `
                INSERT INTO user_system_role (user_id, role)
                SELECT $1, UNNEST($2::system_role[])
                ON CONFLICT DO NOTHING`,
        [request.data.userId, request.data.roles],
      );
    }
  });

  return { state: "success" };
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
