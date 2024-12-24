"use server";

import * as z from "zod";
import { Scrypt } from "oslo/password";
import { getLocale, getTranslations } from "next-intl/server";
import { FormState } from "@/app/components/Form";
import { revalidatePath } from "next/cache";
import { parseForm } from "@/app/form-parser";
import mailer from "@/app/mailer";
import { query } from "@gbt/db/query";
import { randomBytes } from "crypto";

const scrypt = new Scrypt();

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

const EMAIL_VERIFICATION_EXPIRES = 60 * 60 * 1000; // 1 hour

export default async function updateProfile(
  _prevState: FormState,
  data: FormData
): Promise<FormState> {
  const t = await getTranslations("ProfileView");
  const parsedData = parseForm(data) as Record<string, string>;
  const request = profileValidationSchema.safeParse(parsedData, {
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
    return { state: "error", validation: request.error.flatten().fieldErrors };
  }

  if(parsedData.email && parsedData.email !== parsedData.prev_email){
    const token = randomBytes(12).toString('hex');
    await query(
      `INSERT INTO user_email_verification
          (user_id, token, email, expires) 
          VALUES ($1, $2, $3, $4)
      `, 
      [parsedData.user_id, token, parsedData.email, Date.now() + EMAIL_VERIFICATION_EXPIRES]
    );
    const url = `${process.env.ORIGIN}/verify-email?token=${token}`;
    await mailer.sendEmail({
      email: parsedData.email,
      subject: 'Email Verification',
      text: `Please click the link to verify your new email \n\n${url.toString()}`,
      html: `<a href="${url.toString()}">Click here</a> to verify your new email.`,
    })
  }

  if (parsedData.password) {
    await mailer.sendEmail({
      userId: parsedData.user_id,
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
        parsedData.name,
        await scrypt.hash(parsedData.password),
        parsedData.user_id,
      ]
    );
  } else {
    await query(
      `UPDATE users
        SET name = $1
      WHERE id = $2`,
      [parsedData.name, parsedData.user_id]
    );
  }

  revalidatePath(`/${await getLocale()}/profile`);
  return { state: "success", message: t("profile_updated") };
}
