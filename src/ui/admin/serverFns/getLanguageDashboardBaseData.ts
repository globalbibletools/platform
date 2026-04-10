import { createPolicyMiddleware, Policy } from "@/modules/access";
import { getLanguageByCodeReadModel } from "@/modules/languages/read-models/getLanguageByCodeReadModel";
import {
  getLanguageDashboardBooksReadModel,
  type LanguageDashboardBookReadModel,
} from "@/ui/admin/readModels/getLanguageDashboardBooksReadModel";
import {
  getLanguageDashboardMembersReadModel,
  type LanguageDashboardMemberReadModel,
} from "@/ui/admin/readModels/getLanguageDashboardMembersReadModel";
import {
  getLanguageDashboardContributionsReadModel,
  type LanguageDashboardContributionReadModel,
} from "@/ui/admin/readModels/getLanguageDashboardContributionsReadModel";
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
