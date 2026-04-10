import * as z from "zod";
import { searchUsersReadModel } from "@/ui/admin/readModels/searchUsersReadModel";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { createPolicyMiddleware, Policy } from "@/modules/access";

const policy = new Policy({ systemRoles: [Policy.SystemRole.Admin] });

const schema = z.object({
  page: z.coerce.number().int().default(1),
  limit: z.coerce.number().int().default(20),
});

export const loadAdminUsersPage = createServerFn()
  .inputValidator(schema)
  .middleware([createPolicyMiddleware({ policy })])
  .handler(async ({ data }) => {
    if (data.page <= 0) {
      throw redirect({ to: "/admin/users", search: { page: 1 } });
    }

    const { page: users, total } = await searchUsersReadModel({
      page: data.page - 1,
      limit: data.limit,
    });

    if (users.length === 0 && data.page !== 1) {
      throw redirect({ to: "/admin/users", search: { page: 1 } });
    }

    return { users, total };
  });
