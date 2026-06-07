import * as z from "zod";
import { serverActionLogger } from "@/server-action";
import { createServerFn } from "@tanstack/react-start";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import { enqueueJob } from "./enqueueJob";
import { jobRegistry } from "./jobRegistry";

const queueJobSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("export_analytics"),
  }),
  z.object({
    type: z.literal("update_book_completion_progress"),
    payload: jobRegistry.update_book_completion_progress.payloadSchema,
  }),
  z.object({
    type: z.literal("sync_ai_gloss_languages"),
  }),
  z.object({
    type: z.literal("export_glosses"),
    payload: jobRegistry.export_glosses.payloadSchema,
  }),
]);

const policy = new Policy({ systemRoles: [Policy.SystemRole.Admin] });

export const queueJobAction = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => queueJobSchema.parse(data))
  .middleware([createPolicyMiddleware({ policy })])
  .handler(async ({ data }) => {
    const logger = serverActionLogger("queueJobAction");

    try {
      await enqueueJob(data as any);
    } catch (error) {
      logger.error(error);
      throw error;
    }
  });
