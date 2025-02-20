"use server";

import * as z from "zod";
import { getLocale, getTranslations } from "next-intl/server";
import { query } from "@/db";
import { parseForm } from "@/form-parser";
import { clearSessionsForUser, verifySession } from "@/session";
import { notFound } from "next/navigation";
import { FormState } from "@/components/Form";
import { revalidatePath } from "next/cache";
import { serverActionLogger } from "@/server-action";
import DisableUser from "../use-cases/DisableUser";
import userRepository from "../data-access/UserRepository";
import { languageClient } from "@/modules/languages/public/LanguageClient";
import { NotFoundError } from "@/shared/errors";

const requestSchema = z.object({
  userId: z.string().min(1),
});

const disableUserUseCase = new DisableUser(userRepository, languageClient);

export async function disableUser(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const logger = serverActionLogger("disableUser");

  const t = await getTranslations("AdminUsersPage");

  const session = await verifySession();
  if (!session) {
    logger.error("unauthorized");
    notFound();
  }

  const request = requestSchema.safeParse(parseForm(formData));
  if (!request.success) {
    logger.error("request parse error");
    return {
      state: "error",
      error: t("errors.invalid_request"),
    };
  }

  if (!session?.user.roles.includes("ADMIN")) {
    logger.error("unauthorized");
    notFound();
  }

  try {
    await disableUserUseCase.execute({
      userId: request.data.userId,
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    } else {
      throw error;
    }
  }

  await clearSessionsForUser(request.data.userId);

  const locale = await getLocale();
  revalidatePath(`/${locale}/admin/users`);

  return { state: "success", message: "User disabled successfully" };
}
