import * as z from "zod";
import { createServerFn } from "@tanstack/react-start";
import { parseForm } from "@/form-parser";
import { serverActionLogger } from "@/server-action";
import { inviteUser as inviteUserUseCase } from "../use-cases/inviteUser";
import { UserAlreadyActiveError } from "../model/errors";
import { createPolicyMiddleware, Policy } from "@/modules/access";

const requestSchema = z.object({
  email: z.string().email().min(1),
});

const policy = new Policy({ systemRoles: [Policy.SystemRole.Admin] });

export const inviteUser = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) {
      throw new Error("expected FormData");
    }

    return requestSchema.parse(parseForm(data));
  })
  .middleware([createPolicyMiddleware({ policy })])
  .handler(async ({ data }) => {
    const logger = serverActionLogger("inviteUser");

    try {
      await inviteUserUseCase({ email: data.email });
    } catch (error) {
      if (error instanceof UserAlreadyActiveError) {
        logger.error("user already exists");
        // TODO: Convert to error code
        throw new Error("errors.user_exists");
      }

      throw error;
    }
  });
