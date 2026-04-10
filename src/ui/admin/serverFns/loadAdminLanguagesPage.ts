import * as z from "zod";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import { searchLanguagesReadModel } from "@/ui/admin/readModels/searchLanguagesReadModel";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const policy = new Policy({ systemRoles: [Policy.SystemRole.Admin] });

const schema = z.object({
  page: z.coerce.number().int().default(1),
  limit: z.coerce.number().int().default(20),
});

export const loadAdminLanguagesPage = createServerFn()
  .inputValidator(schema)
  .middleware([createPolicyMiddleware({ policy })])
  .handler(async ({ data }) => {
    if (data.page <= 0) {
      throw redirect({ to: "/admin/languages", search: { page: 1 } });
    }

    const { page: languages, total } = await searchLanguagesReadModel({
      page: data.page - 1,
      limit: data.limit,
    });

    if (languages.length === 0 && data.page !== 1) {
      throw redirect({ to: "/admin/languages", search: { page: 1 } });
    }

    return { languages, total };
  });
