"use server";

import * as z from "zod";
import { getTranslations, getLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { parseForm } from "@/form-parser";
import { verifySession } from "@/session";
import { FormState } from "@/components/Form";
import { serverActionLogger } from "@/server-action";
import InviteLanguageMember from "../use-cases/InviteLanguageMember";
import languageRepository from "../data-access/languageRepository";
import languageMemberRepository from "../data-access/languageMemberRepository";
import { userClient } from "@/modules/users/public/UserClient";
import { LanguageMemberRoleRaw } from "../model";
import { NotFoundError } from "@/shared/errors";
import Policy from "@/modules/access/public/Policy";

const requestSchema = z.object({
  code: z.string(),
  email: z.string().email().min(1),
  roles: z.array(z.nativeEnum(LanguageMemberRoleRaw)),
});

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
  languageRoles: [Policy.LanguageRole.Admin],
});

const inviteLanguageMemberUseCase = new InviteLanguageMember(
  languageRepository,
  languageMemberRepository,
  userClient,
);

export async function inviteLanguageMember(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const logger = serverActionLogger("inviteUser");

  const t = await getTranslations("InviteUserPage");

  const request = requestSchema.safeParse(parseForm(formData), {
    errorMap: (error) => {
      if (error.path.toString() === "email") {
        if (error.code === "too_small") {
          return { message: t("errors.email_required") };
        } else {
          return { message: t("errors.email_format") };
        }
      } else {
        return { message: "Invalid" };
      }
    },
  });
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
    await inviteLanguageMemberUseCase.execute(request.data);
  } catch (error) {
    if (error instanceof NotFoundError) {
      logger.error("language not found");
      notFound();
    } else {
      throw error;
    }
  }

  const locale = await getLocale();
  redirect(`/${locale}/admin/languages/${request.data.code}/users`);
}
