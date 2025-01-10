"use server";

import * as z from "zod";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { query } from "@/db";
import { parseForm } from "@/form-parser";
import mailer from "@/mailer";
import { Scrypt } from "oslo/password";
import { createSession } from "@/session";
import { FormState } from "@/components/Form";
import homeRedirect from "@/home-redirect";

const scrypt = new Scrypt();

const resetPasswordSchema = z
  .object({
    token: z.string(),
    password: z.string().min(1),
    confirm_password: z.string().min(1),
  })
  .refine((data) => data.password === data.confirm_password, {
    path: ["confirm_password"],
  });

export async function resetPassword(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const t = await getTranslations("ResetPasswordPage");

  const request = resetPasswordSchema.safeParse(parseForm(formData), {
    errorMap: (error) => {
      if (error.path.toString() === "password") {
        if (error.code === "too_small") {
          return { message: t("errors.password_format") };
        } else {
          return { message: t("errors.password_required") };
        }
      } else if (error.path.toString() === "confirm_password") {
        if (error.code === "custom") {
          return { message: t("errors.confirm_password_mismatch") };
        } else {
          return { message: t("errors.confirm_password_required") };
        }
      } else {
        return { message: "Invalid" };
      }
    },
  });
  if (!request.success) {
    return {
      state: "error",
      validation: request.error.flatten().fieldErrors,
    };
  }

  const hashedPassword = await scrypt.hash(request.data.password);
  const result = await query<{ id: string }>(
    `
            UPDATE users AS u SET
               hashed_password = $2
            FROM reset_password_token AS t
            WHERE u.id = t.user_id
                AND t.token = $1
                AND t.expires > (EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::bigint * 1000::bigint)
            RETURNING id
        `,
    [request.data.token, hashedPassword],
  );

  const user = result.rows[0];
  if (!user) {
    notFound();
  }

  await Promise.all([
    query(`DELETE FROM reset_password_token WHERE token = $1`, [
      request.data.token,
    ]),
    mailer.sendEmail({
      userId: user.id,
      subject: "Password Changed",
      text: `Your password for Global Bible Tools has changed.`,
      html: `Your password for Global Bible Tools has changed.`,
    }),
    createSession(user.id),
  ]);

  redirect(await homeRedirect());
}
