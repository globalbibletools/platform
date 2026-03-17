import * as z from "zod";
import { parseForm } from "@/form-parser";
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { serverActionLogger } from "@/server-action";
import { changeUserRoles as changeUserRolesUseCase } from "../use-cases/changeUserRoles";
import { SystemRoleRaw } from "../model/SystemRole";
import { NotFoundError } from "@/shared/errors";
import { createPolicyMiddleware, Policy } from "@/modules/access";

const requestSchema = z.object({
  userId: z.string().min(1),
  roles: z.array(z.nativeEnum(SystemRoleRaw)).optional().default([]),
});

const policy = new Policy({ systemRoles: [Policy.SystemRole.Admin] });

export const changeUserRoles = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) {
      throw new Error("expected FormData");
    }

    return requestSchema.parse(parseForm(data));
  })
  .middleware([createPolicyMiddleware({ policy })])
  .handler(async ({ data }) => {
    const logger = serverActionLogger("changeUserRole");

    try {
      await changeUserRolesUseCase(data);
    } catch (error) {
      if (error instanceof NotFoundError) {
        logger.error("user not found");
        throw notFound();
      }

      throw error;
    }
  });
