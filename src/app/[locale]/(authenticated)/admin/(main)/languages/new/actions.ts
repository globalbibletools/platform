"use server";

import * as z from "zod";
import { getTranslations, getLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { query } from "@/db";
import { verifySession } from "@/session";
import { FormState } from "@/components/Form";

const requestSchema = z.object({
  code: z.string().length(3),
  name: z.string().min(1),
});

export async function createLanguage(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const t = await getTranslations("NewLanguagePage");
  const locale = await getLocale();

  const session = await verifySession();
  if (!session?.user.roles.includes("ADMIN")) {
    notFound();
  }

  const request = requestSchema.safeParse(
    {
      code: formData.get("code"),
      name: formData.get("name"),
    },
    {
      errorMap: (error) => {
        if (error.path.toString() === "code") {
          return { message: t("errors.code_size") };
        } else if (error.path.toString() === "name") {
          return { message: t("errors.name_required") };
        } else {
          return { message: "Invalid" };
        }
      },
    },
  );
  if (!request.success) {
    return {
      state: "error",
      validation: request.error.flatten().fieldErrors,
    };
  }

  const existsQuery = await query(`SELECT FROM language WHERE code = $1`, [
    request.data.code,
  ]);
  if (existsQuery.rows.length > 0) {
    return {
      state: "error",
      error: t("errors.language_exists"),
    };
  }

  await query(`INSERT INTO language (code, name) VALUES ($1, $2)`, [
    request.data.code,
    request.data.name,
  ]);

  redirect(`/${locale}/admin/languages/${request.data.code}/settings`);
}
