import { createJobModel } from "@/shared/jobs/model";
import * as z from "zod";

const ExportGlossesSqlitePayloadSchema = z.object({
  languageCodes: z.array(z.string()),
});

export class ExportGlossesSqliteJob extends createJobModel({
  type: "export_glosses_sqlite",
  payloadSchema: ExportGlossesSqlitePayloadSchema,
}) {}
