import { createJobModel } from "@/shared/jobs/model";
import * as z from "zod";

const EmailOptionsSchema = z.union([
  z.object({
    userId: z.string(),
    subject: z.string(),
    text: z.string(),
    html: z.string(),
  }),
  z.object({
    email: z.string(),
    subject: z.string(),
    text: z.string(),
    html: z.string(),
  }),
]);

export class SendEmailJob extends createJobModel({
  type: "send_email",
  payloadSchema: EmailOptionsSchema,
}) {}
