import * as z from "zod";
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { parseForm } from "@/form-parser";
import { serverActionLogger } from "@/server-action";
import { reinviteUser as reinviteUserUseCase } from "../use-cases/reinviteUser";
import { UserAlreadyActiveError } from "../model/errors";
import { NotFoundError } from "@/shared/errors";
import { createPolicyMiddleware, Policy } from "@/modules/access";

const requestSchema = z.object({
  userId: z.string().min(1),
});

const policy = new Policy({ systemRoles: [Policy.SystemRole.Admin] });

export const reinviteUserAction = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) {
      throw new Error("expected FormData");
    }

    return requestSchema.parse(parseForm(data));
  })
  .middleware([createPolicyMiddleware({ policy })])
  .handler(async ({ data }) => {
    const logger = serverActionLogger("reinviteUserAction");

    try {
      await reinviteUserUseCase({ userId: data.userId });
    } catch (error) {
      if (error instanceof NotFoundError) {
        logger.error("user not found");
        throw notFound();
      }

      if (error instanceof UserAlreadyActiveError) {
        logger.error("user already active");
        // TODO: convert to error code
        throw new Error("errors.user_exists");
      }

      throw error;
    }
  });
