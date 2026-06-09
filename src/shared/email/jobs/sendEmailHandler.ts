import mailer from "@/shared/email";
import { SendEmailJob } from "./SendEmailJob";

import type { EmailOptions } from "@/shared/email";

export async function sendEmailHandler(job: SendEmailJob) {
  await mailer.sendEmail(job.payload as EmailOptions);
}
