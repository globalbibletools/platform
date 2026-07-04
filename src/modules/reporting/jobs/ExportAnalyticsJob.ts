import { createJobModel } from "@/shared/jobs/model";
import * as z from "zod";

export class ExportAnalyticsJob extends createJobModel({
  type: "export_analytics",
  queueName: "light",
  payloadSchema: z.any(),
}) {}
