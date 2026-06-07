import { createJobModel } from "@/shared/jobs/model";
import * as z from "zod";

const ExportGlossesPayloadSchema = z.object({
  windowDays: z.number().optional(),
});

export class ExportGlossesJob extends createJobModel({
  type: "export_glosses",
  payloadSchema: ExportGlossesPayloadSchema,
}) {}
