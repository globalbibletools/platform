"use server";

import * as z from "zod";
import { query } from "@/app/db";
import { Scrypt } from "oslo/password";
import { getLocale, getTranslations } from "next-intl/server";
import { FormState } from "@/app/components/Form";
import { revalidatePath } from "next/cache";
import { parseForm } from "@/app/form-parser";
import mailer from "@/app/mailer";

const scrypt = new Scrypt();

const profileValidationSchema = z
  .object({
    email: z.string().email().min(1),
    name: z.string().min(1),
    password: z.union([z.string().min(8), z.literal("")]).optional(),
    confirmPassword: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirm_password"],
  });

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

  if (parsedData.password) {
    await mailer.sendEmail({
      userId: parsedData.userId,
      subject: "Password Changed",
      text: `Your password for Global Bible Tools has changed.`,
      html: `Your password for Global Bible Tools has changed.`,
    });
    await query(
      `UPDATE "User"
                  SET "email" = $1,
                      "name" = $2, 
                      "hashedPassword" = $3
                WHERE "id" = $4`,
      [
        parsedData.email,
        parsedData.name,
        await scrypt.hash(parsedData.password),
        parsedData.userId,
      ]
    );
  } else {
    await query(
      `UPDATE "User"
                SET "email" = $1,
                    "name" = $2
              WHERE "id" = $3`,
      [parsedData.email, parsedData.name, parsedData.userId]
    );
  }

  revalidatePath(`/${await getLocale()}/profile`);
  return { state: "success", message: t("profile_updated") };
}
