import * as z from "zod";
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { parseForm } from "@/form-parser";
import { serverActionLogger } from "@/server-action";
import { NotFoundError } from "@/shared/errors";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import { reinviteLanguageMember } from "../use-cases/reinviteLanguageMember";

const requestSchema = z.object({
  code: z.string(),
  userId: z.string(),
});

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
});

export const reinviteLanguageMemberAction = createServerFn({ method: "POST" })
  .inputValidator(requestSchema)
  .middleware([
    createPolicyMiddleware({
      policy,
    }),
  ])
  .handler(async ({ data }) => {
    const logger = serverActionLogger("reinviteUser");

    try {
      await reinviteLanguageMember(data);
    } catch (error) {
      if (error instanceof NotFoundError) {
        logger.error("language not found");
        throw notFound();
      }

      throw error;
    }
  });
