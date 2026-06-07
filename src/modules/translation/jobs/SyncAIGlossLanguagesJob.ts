import { createJobModel } from "@/shared/jobs/model";
import * as z from "zod";

export class SyncAIGlossLanguagesJob extends createJobModel({
  type: "sync_ai_gloss_languages",
  payloadSchema: z.void(),
}) {}
