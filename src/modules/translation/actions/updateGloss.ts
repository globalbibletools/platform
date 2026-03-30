import { createPolicyMiddleware, Policy } from "@/modules/access";
import { serverActionLogger } from "@/server-action";
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import * as z from "zod";
import { GlossApprovalMethodRaw, GlossStateRaw } from "../types";
import { updateGlossUseCase } from "../use-cases/updateGloss";
import { NotFoundError } from "@/shared/errors";

const requestSchema = z.object({
  languageCode: z.string(),
  phraseId: z.coerce.number().int(),
  state: z.nativeEnum(GlossStateRaw).optional(),
  gloss: z.string().optional(),
  method: z.nativeEnum(GlossApprovalMethodRaw).optional(),
});

const policy = new Policy({
  languageMember: true,
});

export const updateGlossAction = createServerFn({ method: "POST" })
  .inputValidator(requestSchema)
  .middleware([
    createPolicyMiddleware({
      policy,
      languageCodeField: "languageCode",
    }),
  ])
  .handler(async ({ data, context }) => {
    const logger = serverActionLogger("updateGloss");

    try {
      await updateGlossUseCase({
        ...data,
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
