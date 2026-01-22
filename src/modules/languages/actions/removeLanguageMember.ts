"use server";

import * as z from "zod";
import { getLocale, getTranslations } from "next-intl/server";
import { parseForm } from "@/form-parser";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/session";
import { notFound } from "next/navigation";
import { FormState } from "@/components/Form";
import { serverActionLogger } from "@/server-action";
import RemoveLanguageMember from "../use-cases/RemoveLanguageMember";
import languageRepository from "../data-access/languageRepository";
import languageMemberRepository from "../data-access/languageMemberRepository";
import { NotFoundError } from "@/shared/errors";
import { Policy } from "@/modules/access";

const requestSchema = z.object({
  code: z.string(),
  userId: z.string(),
});

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
});

const removeLanguageMemberUseCase = new RemoveLanguageMember(
  languageRepository,
  languageMemberRepository,
);

export async function removeLanguageMember(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const logger = serverActionLogger("removeLanguageUser");

  const t = await getTranslations("AdminUsersPage");

  const request = requestSchema.safeParse(parseForm(formData));
  if (!request.success) {
    logger.error("request parse error");
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
    await removeLanguageMemberUseCase.execute(request.data);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    } else {
      throw error;
    }
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/admin/languages/${request.data.code}/users`);

  return { state: "success", message: "User removed successfully." };
}
