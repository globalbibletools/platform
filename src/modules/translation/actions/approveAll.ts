import * as z from "zod";
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { serverActionLogger } from "@/server-action";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import { GlossApprovalMethodRaw } from "../types";
import { approveAllUseCase } from "../use-cases/approveAll";
import { NotFoundError } from "@/shared/errors";

const requestSchema = z.object({
  code: z.string(),
  phrases: z.array(
    z.object({
      id: z.number(),
      gloss: z.string(),
      method: z.nativeEnum(GlossApprovalMethodRaw).optional(),
    }),
  ),
});

const policy = new Policy({
  languageMember: true,
});

export const approveAll = createServerFn({ method: "POST" })
  .inputValidator(requestSchema)
  .middleware([
    createPolicyMiddleware({
      policy,
      languageCodeField: "code",
    }),
  ])
  .handler(async ({ data, context }) => {
    console.log(data);
    const logger = serverActionLogger("approveAll");

    try {
      await approveAllUseCase({
        languageCode: data.code,
        phrases: data.phrases,
        userId: context.session.user.id,
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        logger.error("not found");
        throw notFound();
      }

      throw error;
    }
  });
