import * as z from "zod";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import exportJobQueryService from "@/modules/export/data-access/ExportJobQueryService";
import { createServerFn } from "@tanstack/react-start";

const requestSchema = z.object({
  languageCode: z.string().min(1),
});

const policy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
  languageMember: true,
});

export const getInterlinearExportPanelData = createServerFn()
  .inputValidator(requestSchema)
  .middleware([
    createPolicyMiddleware({
      policy,
    }),
  ])
  .handler(async ({ data }) => {
    const [jobs, pendingJob] = await Promise.all([
      exportJobQueryService.findRecentForLanguage(data.languageCode),
      exportJobQueryService.findPendingForLanguage(data.languageCode),
    ]);

    return { jobs, pendingJob };
  });
