import * as z from "zod";
import { serverActionLogger } from "@/server-action";
import { createServerFn } from "@tanstack/react-start";
import { createPolicyMiddleware, Policy } from "@/modules/access";
import { enqueueJob } from "./enqueueJob";

const queueJobSchema = z.object({
  type: z.string(),
  payload: z.any().optional(),
});

const policy = new Policy({ systemRoles: [Policy.SystemRole.Admin] });

export const queueJobAction = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => queueJobSchema.parse(data))
  .middleware([createPolicyMiddleware({ policy })])
  .handler(async ({ data }) => {
    const logger = serverActionLogger("queueJobAction");

    try {
      await enqueueJob(data.type, data.payload);
    } catch (error) {
      logger.error(error);
      throw error;
    }
  });
