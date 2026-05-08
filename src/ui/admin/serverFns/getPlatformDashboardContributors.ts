import { createPolicyMiddleware, Policy } from "@/modules/access";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { getPlatformDashboardContributorsReadModel } from "@/ui/admin/readModels/getPlatformDashboardContributorsReadModel";

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
});

const requestSchema = z.object({
  range: z.enum(["30d", "6m"]),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().default(20),
});

export const getPlatformDashboardContributors = createServerFn()
  .inputValidator(requestSchema)
  .middleware([createPolicyMiddleware({ policy })])
  .handler(async ({ data }) => {
    return getPlatformDashboardContributorsReadModel({
      range: data.range,
      limit: data.limit,
      cursor: data.cursor,
    });
  });
