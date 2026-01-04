"use server";

import * as z from "zod";
import { getTranslations } from "next-intl/server";
import { parseForm } from "@/form-parser";
import { verifySession } from "@/session";
import { notFound } from "next/navigation";
import { FormState } from "@/components/Form";
import { serverActionLogger } from "@/server-action";
import { changeUserRoles as changeUserRolesUseCase } from "../use-cases/changeUserRoles";
import { SystemRoleRaw } from "../model/SystemRole";
import { NotFoundError } from "@/shared/errors";
import { Policy } from "@/modules/access";

const requestSchema = z.object({
  userId: z.string().min(1),
  roles: z.array(z.nativeEnum(SystemRoleRaw)).optional().default([]),
});

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
});

export async function changeUserRoles(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const logger = serverActionLogger("changeUserRole");

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
  });
  if (!authorized) {
    logger.error("unauthorized");
    notFound();
  }

  try {
    await changeUserRolesUseCase(request.data);
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
