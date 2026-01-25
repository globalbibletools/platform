"use server";

import * as z from "zod";
import { getTranslations, getLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { parseForm } from "@/form-parser";
import { verifySession } from "@/session";
import { FormState } from "@/components/Form";
import { serverActionLogger } from "@/server-action";
import { inviteLanguageMember as inviteLanguageMemberUseCase } from "../use-cases/inviteLanguageMember";
import { NotFoundError } from "@/shared/errors";
import { Policy } from "@/modules/access";

const requestSchema = z.object({
  code: z.string(),
  email: z.string().email().min(1),
});

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
});

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
    await inviteLanguageMemberUseCase(request.data);
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
