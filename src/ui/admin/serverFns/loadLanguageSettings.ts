import * as z from "zod";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import { getAllLanguagesReadModel } from "@/ui/admin/readModels/getAllLanguagesReadModel";
import { getLanguageSettingsReadModel } from "@/ui/admin/readModels/getLanguageSettingsReadModel";
import { BibleClient } from "@gracious.tech/fetch-client";
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
  languageMember: true,
});

const loaderRequestSchema = z.object({ code: z.string() });

export const loadLanguageSettings = createServerFn()
  .inputValidator(loaderRequestSchema)
  .middleware([
    createPolicyMiddleware({
      policy,
      languageCodeField: "code",
    }),
  ])
  .handler(async ({ data }) => {
    const [languageSettings, languages, translations] = await Promise.all([
      getLanguageSettingsReadModel(data.code),
      getAllLanguagesReadModel(),
      fetchTranslations(data.code),
    ]);

    if (!languageSettings) {
      throw notFound();
    }

    return { languageSettings, languages, translations };
  });

async function fetchTranslations(
  languageCode: string,
): Promise<{ id: string; name: string }[]> {
  const client = new BibleClient();
  const collection = await client.fetch_collection();
  const translations = collection.get_translations({
    sort_by_year: true,
    language: languageCode,
  });

  return translations.map(({ id, name_english, name_local }) => ({
    id,
    name: name_local ? name_local : name_english,
  }));
}
