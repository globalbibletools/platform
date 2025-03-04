"use server";

import * as z from "zod";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { verifySession } from "@/session";
import { FormState } from "@/components/Form";
import { serverActionLogger } from "@/server-action";
import UpdateLanguageSettings from "../use-cases/UpdateLanguageSettings";
import languageRepository from "../data-access/LanguageRepository";
import { TextDirectionRaw } from "../model";
import { NotFoundError } from "@/shared/errors";
import Policy from "@/modules/access/public/Policy";

const requestSchema = z.object({
  code: z.string(),
  name: z.string().min(1),
  font: z.string().min(1),
  textDirection: z.nativeEnum(TextDirectionRaw),
  translationIds: z.array(z.string()).optional(),
  gtSourceLanguage: z.string().min(1),
});

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
  languageRoles: [Policy.LanguageRole.Admin],
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
      gtSourceLanguage: formData.get("gt_source_language"),
    },
    {
      errorMap: (error) => {
        if (error.path.toString() === "name") {
          return { message: t("errors.name_required") };
        } else if (error.path.toString() === "font") {
          return { message: t("errors.font_required") };
        } else if (error.path.toString() === "textDirection") {
          return { message: t("errors.text_direction_required") };
        } else if (error.path.toString() === "gtSourceLanguage") {
          return { message: t("errors.gt_source_language_required") };
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

  const session = await verifySession();
  const authorized = await policy.authorize({
    actorId: session?.user.id,
    languageCode: request.data.code,
  });
  if (!authorized) {
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
