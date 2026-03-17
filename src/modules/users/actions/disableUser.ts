import * as z from "zod";
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { serverActionLogger } from "@/server-action";
import { disableUser as disableUserUseCase } from "../use-cases/disableUser";
import { NotFoundError } from "@/shared/errors";
import { createPolicyMiddleware, Policy } from "@/modules/access";

const requestSchema = z.object({
  userId: z.string().min(1),
});

const policy = new Policy({ systemRoles: [Policy.SystemRole.Admin] });

export const disableUser = createServerFn({ method: "POST" })
  .inputValidator(requestSchema)
  .middleware([createPolicyMiddleware({ policy })])
  .handler(async ({ data }) => {
    const logger = serverActionLogger("disableUser");

    try {
      await disableUserUseCase({
        userId: data.userId,
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw notFound();
      }

      throw error;
    }
  });
