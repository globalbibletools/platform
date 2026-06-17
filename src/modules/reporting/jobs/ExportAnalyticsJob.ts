import { createJobModel } from "@/shared/jobs/model";
import * as z from "zod";

export class ExportAnalyticsJob extends createJobModel({
  type: "export_analytics",
  payloadSchema: z.any(),
}) {}
