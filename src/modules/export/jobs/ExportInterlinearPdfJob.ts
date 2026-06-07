import { createJobModel } from "@/shared/jobs/model";
import * as z from "zod";

const ExportInterlinearPdfPayloadSchema = z.object({
  languageId: z.string(),
  languageCode: z.string(),
  requestedBy: z.string(),
});

const ExportInterlinearPdfDataSchema = z.object({
  exportKey: z.string().optional(),
  downloadUrl: z.string().optional(),
  pages: z.number().optional(),
});

export class ExportInterlinearPdfJob extends createJobModel({
  type: "export_interlinear_pdf",
  payloadSchema: ExportInterlinearPdfPayloadSchema,
  dataSchema: ExportInterlinearPdfDataSchema,
}) {}
