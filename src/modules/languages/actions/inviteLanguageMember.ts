import * as z from "zod";
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { parseForm } from "@/form-parser";
import { serverActionLogger } from "@/server-action";
import { inviteLanguageMember as inviteLanguageMemberUseCase } from "../use-cases/inviteLanguageMember";
import { NotFoundError } from "@/shared/errors";
import { createPolicyMiddleware, Policy } from "@/modules/access";

const requestSchema = z.object({
  code: z.string(),
  email: z.string().email().min(1),
});

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
});

export const inviteLanguageMember = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    if (!(data instanceof FormData)) {
      throw new Error("expected FormData");
    }

    return requestSchema.parse(parseForm(data));
  })
  .middleware([
    createPolicyMiddleware({
      policy,
      languageCodeField: "code",
    }),
  ])
  .handler(async ({ data }) => {
    const logger = serverActionLogger("inviteUser");

    try {
      await inviteLanguageMemberUseCase(data);
    } catch (error) {
      if (error instanceof NotFoundError) {
        logger.error("language not found");
        throw notFound();
      }

      throw error;
    }

    // TODO: redirect on client
  });
