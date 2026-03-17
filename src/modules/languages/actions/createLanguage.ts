import * as z from "zod";
import { createServerFn } from "@tanstack/react-start";
import { parseForm } from "@/form-parser";
import { serverActionLogger } from "@/server-action";
import { createLanguage as createLanguageUseCase } from "../use-cases/createLanguage";
import { LanguageAlreadyExistsError } from "../model";
import { createPolicyMiddleware, Policy } from "@/modules/access";

const requestSchema = z.object({
  code: z.string().length(3),
  englishName: z.string().min(1),
  localName: z.string().min(1),
});

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
});

export const createLanguage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) {
      throw new Error("expected FormData");
    }

    return requestSchema.parse(parseForm(data));
  })
  .middleware([createPolicyMiddleware({ policy })])
  .handler(async ({ data }) => {
    const logger = serverActionLogger("createLanguage");

    try {
      await createLanguageUseCase(data);
    } catch (error) {
      if (error instanceof LanguageAlreadyExistsError) {
        logger.error("language already exists");
        // TODO: convert to error code
        throw new Error("language_exists");
      }

      throw error;
    }

    // TODO: redirect on client
  });
