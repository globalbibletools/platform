"use server";

import * as z from "zod";
import { getTranslations } from "next-intl/server";
import { parseForm } from "@/form-parser";
import { verifySession } from "@/session";
import { notFound } from "next/navigation";
import { FormState } from "@/components/Form";
import { serverActionLogger } from "@/server-action";
import ChangeUserRoles from "../use-cases/ChangeUserRoles";
import userRepository from "../data-access/UserRepository";
import { SystemRoleRaw } from "../model/SystemRole";
import { NotFoundError } from "@/shared/errors";

const requestSchema = z.object({
  userId: z.string().min(1),
  roles: z.array(z.nativeEnum(SystemRoleRaw)).optional().default([]),
});

const changeUserRolesUseCase = new ChangeUserRoles(userRepository);

export async function changeUserRoles(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const logger = serverActionLogger("changeUserRole");

  const t = await getTranslations("AdminUsersPage");

  const session = await verifySession();
  if (!session?.user.roles.includes("ADMIN")) {
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

  try {
    await changeUserRolesUseCase.execute(request.data);
  } catch (error) {
    if (error instanceof NotFoundError) {
      logger.error("user not found");
      notFound();
    } else {
      throw error;
    }
  }

  return { state: "success" };
}
