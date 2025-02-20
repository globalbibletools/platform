"use server";

import * as z from "zod";
import { getTranslations, getLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { query } from "@/db";
import { parseForm } from "@/form-parser";
import { verifySession } from "@/session";
import { FormState } from "@/components/Form";
import { serverActionLogger } from "@/server-action";
import InviteLanguageMember from "../use-cases/InviteLanguageMember";
import languageRepository from "../data-access/LanguageRepository";
import languageMemberRepository from "../data-access/LanguageMemberRepository";
import { userClient } from "@/modules/users/public/UserClient";
import { LanguageMemberRoleRaw } from "../model";
import { NotFoundError } from "@/shared/errors";

const requestSchema = z.object({
  code: z.string(),
  email: z.string().email().min(1),
  roles: z.array(z.nativeEnum(LanguageMemberRoleRaw)),
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
  const locale = await getLocale();

  const session = await verifySession();
  if (!session) {
    logger.error("unauthorized");
    notFound();
  }

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
    await inviteLanguageMemberUseCase.execute(request.data);
  } catch (error) {
    if (error instanceof NotFoundError) {
      logger.error("language not found");
      notFound();
    } else {
      throw error;
    }
  }

  redirect(`/${locale}/admin/languages/${request.data.code}/users`);
}
