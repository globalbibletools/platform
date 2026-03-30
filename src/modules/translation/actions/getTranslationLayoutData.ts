import { query } from "@/db";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import { getCurrentLanguageReadModel } from "@/modules/languages/read-models/getCurrentLanguageReadModel";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";

const requestSchema = z.object({
  code: z.string(),
});

const policy = new Policy({ authenticated: true });

interface Language {
  code: string;
  englishName: string;
  localName: string;
}

export const getTranslationLayoutData = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => requestSchema.parse(input))
  .middleware([createPolicyMiddleware({ policy })])
  .handler(async ({ data, context }) => {
    const [languages, currentLanguage] = await Promise.all([
      fetchLanguages(),
      getCurrentLanguageReadModel(data.code, context.session.user.id),
    ]);

    return {
      languages,
      currentLanguage,
      userRoles: context.session.user.roles,
    };
  });

async function fetchLanguages(): Promise<Language[]> {
  const result = await query<Language>(
    `SELECT code, english_name AS "englishName", local_name AS "localName" FROM language ORDER BY "englishName"`,
    [],
  );

  return result.rows;
}
