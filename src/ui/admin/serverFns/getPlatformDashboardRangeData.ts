import { createPolicyMiddleware, Policy } from "@/modules/access";
import { getPlatformDashboardActivityReadModel } from "@/ui/admin/readModels/getPlatformDashboardActivityReadModel";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
});

const requestSchema = z.object({
  range: z.enum(["30d", "6m"]),
});

export const getPlatformDashboardRangeData = createServerFn()
  .inputValidator(requestSchema)
  .middleware([createPolicyMiddleware({ policy })])
  .handler(async ({ data }) => {
    const granularity = data.range === "30d" ? "day" : "week";
    const range = data.range === "30d" ? 30 : 182;

    const activity = await getPlatformDashboardActivityReadModel({
      granularity,
      range,
    });

    return {
      activity,
    };
  });
