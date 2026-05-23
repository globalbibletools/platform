import { createPolicyMiddleware, Policy } from "@/modules/access";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { getPlatformDashboardAILanguagesReadModel } from "@/ui/admin/readModels/getPlatformDashboardAILanguagesReadModel";

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
});

const requestSchema = z.object({
  range: z.enum(["30d", "6m"]),
  query: z.string().default(""),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().default(10),
});

export const getPlatformDashboardAILanguages = createServerFn()
  .inputValidator(requestSchema)
  .middleware([createPolicyMiddleware({ policy })])
  .handler(async ({ data }) => {
    return getPlatformDashboardAILanguagesReadModel({
      range: data.range,
      query: data.query,
      limit: data.limit,
      cursor: data.cursor,
    });
  });
