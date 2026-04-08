import { createPolicyMiddleware, Policy } from "@/modules/access";
import { getLanguageByCodeReadModel } from "@/modules/languages/read-models/getLanguageByCodeReadModel";
import {
  getLanguageDashboardActivityReadModel,
  type LanguageDashboardActivityEntryReadModel,
} from "@/modules/reporting";
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
});

const requestSchema = z.object({
  code: z.string(),
  range: z.enum(["30d", "6m"]),
});

export interface LanguageDashboardRangeData {
  activity: LanguageDashboardActivityEntryReadModel[];
}

export const getLanguageDashboardRangeData = createServerFn()
  .inputValidator(requestSchema)
  .middleware([
    createPolicyMiddleware({
      policy,
      languageCodeField: "code",
    }),
  ])
  .handler(async ({ data }): Promise<LanguageDashboardRangeData> => {
    const language = await getLanguageByCodeReadModel(data.code);
    if (!language) {
      throw notFound();
    }

    return {
      activity: await getLanguageDashboardActivityReadModel({
        languageId: language.id,
        granularity: data.range === "30d" ? "day" : "week",
        range: data.range === "30d" ? 30 : 182,
      }),
    };
  });
