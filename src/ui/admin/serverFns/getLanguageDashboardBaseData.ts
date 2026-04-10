import { createPolicyMiddleware, Policy } from "@/modules/access";
import { getLanguageByCodeReadModel } from "@/modules/languages/read-models/getLanguageByCodeReadModel";
import {
  getLanguageDashboardBooksReadModel,
  getLanguageDashboardContributionsReadModel,
  getLanguageDashboardMembersReadModel,
  type LanguageDashboardBookReadModel,
  type LanguageDashboardContributionReadModel,
  type LanguageDashboardMemberReadModel,
} from "@/modules/reporting";
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
});

const requestSchema = z.object({ code: z.string() });

export interface LanguageDashboardBaseData {
  books: LanguageDashboardBookReadModel[];
  members: LanguageDashboardMemberReadModel[];
  contributions: LanguageDashboardContributionReadModel[];
}

export const getLanguageDashboardBaseData = createServerFn()
  .inputValidator(requestSchema)
  .middleware([
    createPolicyMiddleware({
      policy,
      languageCodeField: "code",
    }),
  ])
  .handler(async ({ data }): Promise<LanguageDashboardBaseData> => {
    const language = await getLanguageByCodeReadModel(data.code);
    if (!language) {
      throw notFound();
    }

    const [books, members, contributions] = await Promise.all([
      getLanguageDashboardBooksReadModel(),
      getLanguageDashboardMembersReadModel(language.id),
      getLanguageDashboardContributionsReadModel(language.id),
    ]);

    return {
      books,
      members,
      contributions,
    };
  });
