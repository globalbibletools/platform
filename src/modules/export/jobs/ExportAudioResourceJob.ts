import { createJobModel } from "@/shared/jobs/model";
import * as z from "zod";

const ExportAudioResourcesPayloadSchema = z.object({
  books: z.array(
    z.object({
      speaker: z.string(),
      bookIds: z.array(z.number().int().min(1).max(66)),
    }),
  ),
});

export class ExportAudioResourcesJob extends createJobModel({
  type: "export_audio_resources",
  payloadSchema: ExportAudioResourcesPayloadSchema,
  queueName: "heavy",
}) {}
