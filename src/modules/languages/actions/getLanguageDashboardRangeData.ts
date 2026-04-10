import { createPolicyMiddleware, Policy } from "@/modules/access";
import { getLanguageByCodeReadModel } from "@/modules/languages/read-models/getLanguageByCodeReadModel";
import {
  getLanguageApprovalActivityReadModel,
  getLanguageDashboardActivityReadModel,
  LanguageApprovalActivityReadModel,
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
  approvalActivity: LanguageApprovalActivityReadModel[];
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

    const granularity = data.range === "30d" ? "day" : "week";
    const range = data.range === "30d" ? 30 : 182;

    const [activity, approvalActivity] = await Promise.all([
      await getLanguageDashboardActivityReadModel({
        languageId: language.id,
        granularity,
        range,
      }),
      await getLanguageApprovalActivityReadModel({
        languageId: language.id,
        granularity,
        range,
      }),
    ]);

    return {
      activity,
      approvalActivity,
    };
  });
