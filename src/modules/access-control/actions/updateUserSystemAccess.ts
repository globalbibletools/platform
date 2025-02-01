"use server";

import * as z from "zod";
import { parseForm } from "@/form-parser";
import { verifySession } from "@/session";
import { FormState } from "@/components/Form";
import { handleError, serverActionLogger } from "@/server-action";
import { verifyAction } from "@/modules/access-control/verifyAction";

import userPolicyRepo from "../data-access/UserPolicyRepository";
import { SystemRoleValue } from "../model/SystemRole";
import UpdateUserSystemRoles from "../use-cases/UpdateUserSystemRoles";

const requestSchema = z.object({
  userId: z.string().min(1),
  roles: z.array(z.nativeEnum(SystemRoleValue)).optional().default([]),
});

export async function updateUserSystemAccess(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const logger = serverActionLogger("changeUserRole");

  let request;
  try {
    request = requestSchema.parse(parseForm(formData));
  } catch (error) {
    return handleError(error);
  }

  const session = await verifySession();
  try {
    await verifyAction({
      userId: session?.user.id,
      action: "update",
      resourceType: "user-access",
      resourceId: request.userId,
    });
  } catch (error) {
    return handleError(error);
  }

  try {
    const updateUserSystemRoles = new UpdateUserSystemRoles(userPolicyRepo);
    await updateUserSystemRoles.execute({
      userId: request.userId,
      systemRoles: request.roles,
    });
    logger.debug("user access changed");
  } catch (error) {
    return handleError(error);
  }

  return { state: "success" };
}
