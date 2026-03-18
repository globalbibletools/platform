import * as z from "zod";
import { getLocale } from "next-intl/server";
import { parseForm } from "@/form-parser";
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { revalidatePath } from "next/cache";
import { serverActionLogger } from "@/server-action";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import { NotFoundError } from "@/shared/errors";
import { enqueueAIGlossImportJob } from "../use-cases/enqueueAIGlossImportJob";

const requestSchema = z.object({
  code: z.string(),
});

const policy = new Policy({ systemRoles: [Policy.SystemRole.Admin] });

export const importAIGlosses = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) {
      throw new Error("expected FormData");
    }

    return requestSchema.parse(parseForm(data));
  })
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

    const locale = await getLocale();
    revalidatePath(`/${locale}/admin/languages/${data.code}/import`);

    return { state: "success" };
  });
