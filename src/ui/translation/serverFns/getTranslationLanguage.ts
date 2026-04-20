import { createPolicyMiddleware, Policy } from "@/modules/access";
import { getCurrentLanguageReadModel } from "@/modules/languages/read-models/getCurrentLanguageReadModel";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { getLanguagesReadModel } from "../readModels/getLanguagesReadModel";

const requestSchema = z.object({
  code: z.string(),
});

const policy = new Policy({ authenticated: true });

export const getTranslationLanguage = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => requestSchema.parse(input))
  .middleware([createPolicyMiddleware({ policy })])
  .handler(async ({ data, context }) => {
    const [languages, currentLanguage] = await Promise.all([
      getLanguagesReadModel(),
      getCurrentLanguageReadModel(data.code, context.session.user.id),
    ]);

    return {
      languages,
      currentLanguage,
    };
  });
