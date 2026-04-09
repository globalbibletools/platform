import { createPolicyMiddleware, Policy } from "@/modules/access";
import { getLanguageByCodeReadModel } from "@/modules/languages/read-models/getLanguageByCodeReadModel";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
  languageMember: true,
});

const requestSchema = z.object({ code: z.string() });

export const Route = createFileRoute("/_main/admin/languages/$code")({
  ssr: "data-only",
  loader: ({ params }) => {
    return loaderFn({ data: params });
  },
});

const loaderFn = createServerFn()
  .inputValidator(requestSchema)
  .middleware([
    createPolicyMiddleware({
      policy,
      languageCodeField: "code",
    }),
  ])
  .handler(async ({ data }) => {
    const language = await getLanguageByCodeReadModel(data.code);
    if (!language) {
      throw notFound();
    }

    return { language };
  });
