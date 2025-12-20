"use server";

import * as z from "zod";
import { getLocale, getTranslations } from "next-intl/server";
import { parseForm } from "@/form-parser";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/session";
import { notFound } from "next/navigation";
import { FormState } from "@/components/Form";
import { serverActionLogger } from "@/server-action";
import ChangeLanguageMemberRoles from "../use-cases/ChangeLanguageMemberRoles";
import languageRepository from "../data-access/languageRepository";
import languageMemberRepository from "../data-access/languageMemberRepository";
import { LanguageMemberRoleRaw } from "../model";
import { NotFoundError } from "@/shared/errors";
import Policy from "@/modules/access/public/Policy";

const requestSchema = z.object({
  code: z.string(),
  userId: z.string(),
  roles: z.array(z.nativeEnum(LanguageMemberRoleRaw)).optional().default([]),
});

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
});

const changeLanguageMemberRolesUseCase = new ChangeLanguageMemberRoles(
  languageRepository,
  languageMemberRepository,
);

export async function changeLanguageMemberRoles(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const logger = serverActionLogger("changeUserLanguageRole");

  const t = await getTranslations("AdminUsersPage");

  const request = requestSchema.safeParse(parseForm(formData));
  if (!request.success) {
    logger.error("request parser error");
    return {
      state: "error",
      error: t("errors.invalid_request"),
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
    await changeLanguageMemberRolesUseCase.execute(request.data);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    } else {
      throw error;
    }
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/admin/languages/${request.data.code}/users`);

  return { state: "success", message: "User role updated" };
}
