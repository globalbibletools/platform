"use server";

import * as z from "zod";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { verifySession } from "@/session";
import { FormState } from "@/components/Form";
import { serverActionLogger } from "@/server-action";
import { reinviteUser as reinviteUserUseCase } from "../use-cases/reinviteUser";
import { UserAlreadyActiveError } from "../model/errors";
import { NotFoundError } from "@/shared/errors";
import { Policy } from "@/modules/access";

const requestSchema = z.object({
  userId: z.string().min(1),
});

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
});

export async function reinviteUserAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const logger = serverActionLogger("reinviteUserAction");

  const t = await getTranslations("InviteUserPage");

  const request = requestSchema.safeParse({
    userId: formData.get("userId"),
  });
  if (!request.success) {
    logger.error("request parse error");
    return {
      state: "error",
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
    await reinviteUserUseCase({ userId: request.data.userId });
  } catch (error) {
    if (error instanceof NotFoundError) {
      logger.error("user not found");
      notFound();
    } else if (error instanceof UserAlreadyActiveError) {
      logger.error("user already active");
      return {
        state: "error",
        error: t("errors.user_exists"),
      };
    } else {
      throw error;
    }
  }

  return { state: "success", message: "User invitation resent" };
}
