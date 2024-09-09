"use server";

import * as z from "zod";
import { query } from "@/app/db";
import { Scrypt } from "oslo/password";
import { getTranslations } from "next-intl/server";

const scrypt = new Scrypt();

const profileValidationSchema = z.object({
  email: z.string().min(1),
  name: z.string().min(1),
  password: z.union([z.string().min(8), z.literal("")]),
  confirmPassword: z.string(),
});

export interface ProfileState {
  message?: string;
  errors?: {
    email?: string[];
    name?: string[];
    password?: string[];
    confirmPassword?: string[];
  };
}

export default async function updateProfile(
  state: ProfileState,
  data: FormData
) {
  const t = await getTranslations("ProfileView");
  console.dir({
    email: data.get("email"),
    name: data.get("name"),
    password: data.get("password"),
    confirmPassword: data.get("confirmPassword"),
  });
  const request = profileValidationSchema
    .refine((val) => val.password === val.confirmPassword, {
      path: ["confirmPassword"],
    })
    .safeParse(
      {
        email: data.get("email"),
        name: data.get("name"),
        password: data.get("password"),
        confirmPassword: data.get("confirmPassword"),
      },
      {
        errorMap: (error, ctx) => {
          switch (error.path[0]) {
            case "email":
              return { message: t("errors.email_required") };
            case "name":
              return { message: t("errors.name_required") };
            case "password":
              return {
                message:
                  (ctx.data?.length ?? 0) === 0
                    ? t("errors.password_required")
                    : t("errors.password_format"),
              };
            case "confirmPassword":
              return { message: t("errors.password_confirmation") };
            default:
              return { message: "Invalid" };
          }
        },
      }
    );
  if (!request.success) {
    return { errors: request.error.flatten().fieldErrors };
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
  return {};
}
