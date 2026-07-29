import { createJobModel } from "@/shared/jobs/model";
import * as z from "zod";

export class ExportGlossesFinalizeJob extends createJobModel({
  type: "export_glosses_finalize",
  queueName: "light",
  payloadSchema: z.any(),
}) {}
