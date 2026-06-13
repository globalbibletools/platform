import { createJobModel } from "@/shared/jobs/model";
import * as z from "zod";

export const UpdateBookCompletionProgressPayloadSchema = z.object({
  allLanguages: z.boolean().optional().default(false),
}).optional();

export type UpdateBookCompletionProgressPayload = z.output<
  typeof UpdateBookCompletionProgressPayloadSchema
>;

export class UpdateBookCompletionProgressJob extends createJobModel({
  type: "update_book_completion_progress",
  payloadSchema: UpdateBookCompletionProgressPayloadSchema,
}) {}
