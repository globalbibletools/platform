import * as z from "zod";
import { createServerFn } from "@tanstack/react-start";
import { getJobStatusReadModel } from "../read-models/getJobStatusReadModel";

const requestSchema = z.object({
  jobId: z.string(),
});

export const getJobStatus = createServerFn()
  .inputValidator(requestSchema)
  .handler(async ({ data }) => {
    return getJobStatusReadModel(data.jobId);
  });
