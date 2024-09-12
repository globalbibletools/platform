"use server";

import * as z from "zod";
import { query } from "@/app/db";
import { Scrypt } from "oslo/password";
import { getTranslations } from "next-intl/server";
import { FormState } from "@/app/components/Form";

const scrypt = new Scrypt();

const profileValidationSchema = z
  .object({
    email: z.string().min(1),
    name: z.string().min(1),
    password: z.union([z.string().min(8), z.literal("")]),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirm_password"],
  });

export default async function updateProfile(
  _prevState: FormState,
  data: FormData
): Promise<FormState> {
  const t = await getTranslations("ProfileView");
  const request = profileValidationSchema.safeParse(
    {
      email: data.get("email"),
      name: data.get("name"),
      password: data.get("password"),
      confirmPassword: data.get("confirm_password"),
    },
    {
      errorMap: (error) => {
        switch (error.path[0]) {
          case "email":
            return { message: t("errors.email_required") };
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
    }
  );
  if (!request.success) {
    return { state: "error", validation: request.error.flatten().fieldErrors };
  }
  await query(
    `UPDATE "User"
                SET "email" = $1,
                    "name" = $2,
                    "hashedPassword" = $3
              WHERE "id" = $4`,
    [
      data.get("email"),
      data.get("name"),
      await scrypt.hash(data.get("password") as string),
      data.get("userId"),
    ]
  );
  return { state: "success", message: t("profile_updated") };
}
