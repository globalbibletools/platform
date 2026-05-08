import { createPolicyMiddleware, Policy } from "@/modules/access";
import { getPlatformDashboardContributionsReadModel } from "@/ui/admin/readModels/getPlatformDashboardContributionsReadModel";
import { getPlatformDashboardUsersReadModel } from "@/ui/admin/readModels/getPlatformDashboardUsersReadModel";
import { createServerFn } from "@tanstack/react-start";

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
});

export const getPlatformDashboardBaseData = createServerFn()
  .middleware([createPolicyMiddleware({ policy })])
  .handler(async () => {
    const [users, contributions] = await Promise.all([
      getPlatformDashboardUsersReadModel(),
      getPlatformDashboardContributionsReadModel(),
    ]);

    return {
      users,
      contributions,
    };
  });
