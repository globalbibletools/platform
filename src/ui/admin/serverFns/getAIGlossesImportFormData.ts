import * as z from "zod";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import { getAIGlossImportJobReadModel } from "@/ui/admin/readModels/getAIGlossImportJobReadModel";
import { getAIGlossImportLanguagesReadModel } from "@/ui/admin/readModels/getAIGlossImportLanguagesReadModel";
import { createServerFn } from "@tanstack/react-start";

const requestSchema = z.object({
  code: z.string(),
});

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
  languageMember: true,
});

export const getAIGlossesImportFormData = createServerFn()
  .inputValidator(requestSchema)
  .middleware([
    createPolicyMiddleware({
      policy,
      languageCodeField: "code",
    }),
  ])
  .handler(async ({ data }) => {
    const [job, availableLanguages] = await Promise.all([
      getAIGlossImportJobReadModel(data.code),
      getAIGlossImportLanguagesReadModel(),
    ]);

    const language = availableLanguages.find(
      (entry) => entry.code === data.code,
    );

    return { job, languageAvailable: !!language };
  });
