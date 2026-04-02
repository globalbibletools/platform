import * as z from "zod";
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { serverActionLogger } from "@/server-action";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import { NotFoundError } from "@/shared/errors";
import { enqueueAIGlossImportJob } from "../use-cases/enqueueAIGlossImportJob";

const requestSchema = z.object({
  code: z.string(),
});

const policy = new Policy({ systemRoles: [Policy.SystemRole.Admin] });

export const importAIGlosses = createServerFn({ method: "POST" })
  .inputValidator(requestSchema)
  .middleware([createPolicyMiddleware({ policy })])
  .handler(async ({ data }) => {
    const logger = serverActionLogger("importAIGlosses");

    try {
      await enqueueAIGlossImportJob({
        languageCode: data.code,
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        logger.error("not found");
        throw notFound();
      }

      throw error;
    }
  });
