"use server";

import * as z from "zod";
import { getLocale, getTranslations } from "next-intl/server";
import { query } from "@/db";
import { parseForm } from "@/form-parser";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/session";
import { notFound } from "next/navigation";
import { FormState } from "@/components/Form";
import { serverActionLogger } from "@/server-action";
import ChangeLanguageMemberRoles from "../use-cases/ChangeLanguageMemberRoles";
import languageRepository from "../data-access/LanguageRepository";
import languageMemberRepository from "../data-access/LanguageMemberRepository";
import { LanguageMemberRoleRaw } from "../model";
import { NotFoundError } from "@/shared/errors";

const requestSchema = z.object({
  code: z.string(),
  userId: z.string(),
  roles: z.array(z.nativeEnum(LanguageMemberRoleRaw)).optional().default([]),
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

  const session = await verifySession();
  if (!session) {
    logger.error("unauthorized");
    notFound();
  }

  const request = requestSchema.safeParse(parseForm(formData));
  if (!request.success) {
    logger.error("request parser error");
    return {
      state: "error",
      error: t("errors.invalid_request"),
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
