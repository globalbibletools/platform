"use server";

import * as z from "zod";
import { getTranslations, getLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { verifySession } from "@/session";
import { FormState } from "@/components/Form";
import { serverActionLogger } from "@/server-action";
import CreateLanguage from "../use-cases/CreateLanguage";
import { LanguageAlreadyExistsError } from "../model";
import languageRepository from "../data-access/LanguageRepository";

const requestSchema = z.object({
  code: z.string().length(3),
  name: z.string().min(1),
});

const createLanguageUseCase = new CreateLanguage(languageRepository);

export async function createLanguage(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const logger = serverActionLogger("createLanguage");

  const t = await getTranslations("NewLanguagePage");
  const locale = await getLocale();

  const session = await verifySession();
  if (!session?.user.roles.includes("ADMIN")) {
    logger.error("unauthorized");
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
    logger.error("request parse error");
    return {
      state: "error",
      validation: request.error.flatten().fieldErrors,
    };
  }

  try {
    await createLanguageUseCase.execute(request.data);
  } catch (error) {
    if (error instanceof LanguageAlreadyExistsError) {
      logger.error("language already exists");
      return {
        state: "error",
        error: t("errors.language_exists"),
      };
    } else {
      throw error;
    }
  }

  redirect(`/${locale}/admin/languages/${request.data.code}/settings`);
}
