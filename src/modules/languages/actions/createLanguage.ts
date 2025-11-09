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
import Policy from "@/modules/access/public/Policy";

const requestSchema = z.object({
  code: z.string().length(3),
  english_name: z.string().min(1),
  local_name: z.string().min(1),
});

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
});

const createLanguageUseCase = new CreateLanguage(languageRepository);

export async function createLanguage(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const logger = serverActionLogger("createLanguage");

  const t = await getTranslations("NewLanguagePage");

  const request = requestSchema.safeParse(
    {
      code: formData.get("code"),
      english_name: formData.get("english_name"),
      local_name: formData.get("local_name"),
    },
    {
      errorMap: (error) => {
        if (error.path.toString() === "code") {
          return { message: t("errors.code_size") };
        } else if (error.path.toString() === "english_name") {
          return { message: t("errors.english_name_required") };
        } else if (error.path.toString() === "local_name") {
          return { message: t("errors.local_name_required") };
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
    languageCode: formData.get("code")?.toString(),
  });
  if (!authorized) {
    logger.error("unauthorized");
    notFound();
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

  const locale = await getLocale();
  redirect(`/${locale}/admin/languages/${request.data.code}/settings`);
}
