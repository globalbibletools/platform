"use server";

import * as z from "zod";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { query } from "@/db";
import { verifySession } from "@/session";
import { FormState } from "@/components/Form";
import { serverActionLogger } from "@/server-action";
import UpdateLanguageSettings from "../use-cases/UpdateLanguageSettings";
import languageRepository from "../data-access/LanguageRepository";
import { TextDirectionRaw } from "../model";
import { NotFoundError } from "@/shared/errors";

const requestSchema = z.object({
  code: z.string(),
  name: z.string().min(1),
  font: z.string().min(1),
  textDirection: z.nativeEnum(TextDirectionRaw),
  translationIds: z.array(z.string()).optional(),
});

const updateLanguageSettingsUseCase = new UpdateLanguageSettings(
  languageRepository,
);

export async function updateLanguageSettings(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const logger = serverActionLogger("updateLanguageSettings");

  const t = await getTranslations("LanguageSettingsPage");

  const session = await verifySession();
  if (!session) {
    logger.error("unauthorized");
    notFound();
  }

  const request = requestSchema.safeParse(
    {
      code: formData.get("code"),
      name: formData.get("name"),
      font: formData.get("font"),
      textDirection: formData.get("text_direction"),
      translationIds: formData
        .get("bible_translations")
        ?.toString()
        .split(",")
        .filter((id) => id !== ""),
    },
    {
      errorMap: (error) => {
        if (error.path.toString() === "name") {
          return { message: t("errors.name_required") };
        } else if (error.path.toString() === "font") {
          return { message: t("errors.font_required") };
        } else if (error.path.toString() === "textDirection") {
          return { message: t("errors.text_direction_required") };
        } else {
          return { message: "Invalid" };
        }
      },
    },
  );
  if (!request.success) {
    logger.error("request parse error");
    return {
      state: "error",
      validation: request.error.flatten().fieldErrors,
    };
  }

  const languageQuery = await query<{ roles: string[] }>(
    `SELECT 
            (SELECT COALESCE(json_agg(r.role) FILTER (WHERE r.role IS NOT NULL), '[]') AS roles
            FROM language_member_role AS r WHERE r.language_id = l.id AND r.user_id = $2)
        FROM language AS l WHERE l.code = $1`,
    [request.data.code, session.user.id],
  );
  const language = languageQuery.rows[0];

  if (
    !language ||
    (!session?.user.roles.includes("ADMIN") &&
      !language.roles.includes("ADMIN"))
  ) {
    logger.error("unauthorized");
    notFound();
  }

  try {
    await updateLanguageSettingsUseCase.execute({
      ...request.data,
      translationIds: request.data.translationIds ?? [],
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    } else {
      throw error;
    }
  }

  return { state: "success" };
}
