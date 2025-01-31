"use server";

import * as z from "zod";
import { getTranslations } from "next-intl/server";
import { pool } from "@/db";
import { parseForm } from "@/form-parser";
import { verifySession } from "@/session";
import { notFound } from "next/navigation";
import { FormState } from "@/components/Form";
import { serverActionLogger } from "@/server-action";
import UserSystemAccessRepository from "../data-access/UserSystemAccessRepository";
import SystemRole, { SystemRoleValue } from "../model/SystemRole";

const requestSchema = z.object({
  userId: z.string().min(1),
  roles: z.array(z.nativeEnum(SystemRoleValue)).optional().default([]),
});

export async function updateUserSystemAccess(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const userAccessRepo = new UserSystemAccessRepository(pool);

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

  const userAccess = await userAccessRepo.findByUserId(request.data.userId);
  userAccess.grantAccess(request.data.roles.map(SystemRole.fromRaw));
  await userAccessRepo.commit(userAccess);

  return { state: "success" };
}
