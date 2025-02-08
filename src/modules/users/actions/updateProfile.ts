"use server";

import * as z from "zod";
import { Scrypt } from "oslo/password";
import { getLocale, getTranslations } from "next-intl/server";
import { FormState } from "@/components/Form";
import { revalidatePath } from "next/cache";
import { parseForm } from "@/form-parser";
import mailer from "@/mailer";
import { query } from "@/db";
import { randomBytes } from "crypto";
import { serverActionLogger } from "@/server-action";
import { verifySession } from "@/session";
import { notFound } from "next/navigation";
import { addDays } from "date-fns";

const scrypt = new Scrypt();

const EMAIL_VERIFICATION_EXPIRES = 7; // days

const profileValidationSchema = z
  .object({
    email: z.string().email().min(1),
    name: z.string().min(1),
    password: z.union([z.string().min(8), z.literal("")]).optional(),
    confirm_password: z.string().optional(),
  })
  .refine((data) => data.password === data.confirm_password, {
    path: ["confirm_password"],
  });

export async function updateProfile(
  _prevState: FormState,
  data: FormData,
): Promise<FormState> {
  const logger = serverActionLogger("updateProfile");

  const t = await getTranslations("ProfileView");
  const request = profileValidationSchema.safeParse(parseForm(data), {
    errorMap: (error) => {
      switch (error.path[0]) {
        case "email":
          if (error.code === "invalid_string") {
            return { message: t("errors.email_format") };
          } else {
            return { message: t("errors.email_required") };
          }
        case "name":
          return { message: t("errors.name_required") };
        case "password":
          return { message: t("errors.password_format") };
        case "confirm_password":
          return { message: t("errors.password_confirmation") };
        default:
          return { message: "Invalid" };
      }
    },
  });
  if (!request.success) {
    logger.error("request parse error");
    return {
      state: "error",
      validation: request.error.flatten().fieldErrors,
    };
  }

  const session = await verifySession();
  if (!session) notFound();

  const userQuery = await query(
    `
        select email from users where id = $1
      `,
    [session.user.id],
  );

  if (request.data.email && request.data.email !== userQuery.rows[0].email) {
    const token = randomBytes(12).toString("hex");
    await query(
      `INSERT INTO user_email_verification
          (user_id, token, email, expires) 
          VALUES ($1, $2, $3, $4)
      `,
      [
        session.user.id,
        token,
        request.data.email,
        addDays(new Date(), EMAIL_VERIFICATION_EXPIRES).valueOf(),
      ],
    );
    const url = `${process.env.ORIGIN}/verify-email?token=${token}`;
    await mailer.sendEmail({
      email: request.data.email,
      subject: "Email Verification",
      text: `Please click the link to verify your new email \n\n${url.toString()}`,
      html: `<a href="${url.toString()}">Click here</a> to verify your new email.`,
    });
  }

  if (request.data.password) {
    await mailer.sendEmail({
      userId: session.user.id,
      subject: "Password Changed",
      text: `Your password for Global Bible Tools has changed.`,
      html: `Your password for Global Bible Tools has changed.`,
    });
    await query(
      `UPDATE users
        SET name = $1, 
            hashed_password = $2
        WHERE id = $3`,
      [
        request.data.name,
        await scrypt.hash(request.data.password),
        session.user.id,
      ],
    );
  }

  await query(
    `UPDATE users
        SET name = $1
      WHERE id = $2`,
    [request.data.name, session.user.id],
  );

  revalidatePath(`/${await getLocale()}/profile`);
  return { state: "success", message: t("profile_updated") };
}
