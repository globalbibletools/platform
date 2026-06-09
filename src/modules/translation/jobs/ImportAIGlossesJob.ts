import { createJobModel } from "@/shared/jobs/model";
import * as z from "zod";

const ImportAIGlossesPayloadSchema = z.object({
  languageCode: z.string(),
});

const ImportAIGlossesDataSchema = z.object({
  bookId: z.number().optional(),
});

export class ImportAIGlossesJob extends createJobModel({
  type: "import_ai_glosses",
  payloadSchema: ImportAIGlossesPayloadSchema,
  dataSchema: ImportAIGlossesDataSchema,
}) {}
