import * as z from "zod";
import { parseForm } from "@/form-parser";
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { serverActionLogger } from "@/server-action";
import { removeLanguageMember as removeLanguageMemberUseCase } from "../use-cases/removeLanguageMember";
import { NotFoundError } from "@/shared/errors";
import { createPolicyMiddleware, Policy } from "@/modules/access";

const requestSchema = z.object({
  code: z.string(),
  userId: z.string(),
});

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
});

export const removeLanguageMember = createServerFn({ method: "POST" })
  .inputValidator(requestSchema)
  .middleware([createPolicyMiddleware({ policy })])
  .handler(async ({ data }) => {
    const logger = serverActionLogger("removeLanguageUser");

    try {
      await removeLanguageMemberUseCase(data);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw notFound();
      }

      throw error;
    }
  });
