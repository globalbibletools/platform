import * as z from "zod";
import { createServerFn } from "@tanstack/react-start";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import { serverActionLogger } from "@/server-action";
import { requestInterlinearExport as requestInterlinearExportUseCase } from "../use-cases/requestInterlinearExport";

const exportPolicy = new Policy({
  systemRoles: [Policy.SystemRole.Admin],
  languageMember: true,
});

const requestSchema = z.object({
  languageCode: z.string().min(1),
});

type Request = z.infer<typeof requestSchema>;

export const requestInterlinearExport = createServerFn({ method: "POST" })
  .inputValidator(requestSchema)
  .middleware([
    createPolicyMiddleware({
      policy: exportPolicy,
      languageCodeField: "languageCode",
    }),
  ])
  .handler(
    async ({
      data,
      context,
    }: {
      data: Request;
      context: { session: { user: { id: string } } };
    }) => {
      const logger = serverActionLogger("requestInterlinearExport");

      try {
        await requestInterlinearExportUseCase({
          languageCode: data.languageCode,
          requestedBy: context.session.user.id,
        });
      } catch (error) {
        logger.error({ err: error }, "failed to request export");
        throw new Error("export_failed");
      }
    },
  );
