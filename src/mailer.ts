import { createTransport, SendMailOptions } from "nodemailer";
import { query } from "@/db";
import { Job } from "./shared/jobs/model";
import { logger } from "./logging";

const transporter =
  process.env["EMAIL_SERVER"] ?
    createTransport({
      url: process.env["EMAIL_SERVER"],
    })
  : {
      async sendMail(options: SendMailOptions): Promise<void> {
        console.log(
          `Sending email to ${options.to}:\n${options.text ?? options.html}`,
        );
      },
    };

export type EmailOptions = (
  | {
      /** The user to send the email to. The email will not be sent unless the user's email is verified. */
      userId: string;
    }
  | {
      /** The email address to send to. This bypasses all email verification checks, so use with caution. */
      email: string;
    }
) & {
  /** The subject line of the email. */
  subject: string;
  /** The text of the message for email clients that don't support HTML. */
  text: string;
  /** The email message formatted as HTML. */
  html: string;
};

export class EmailNotVerifiedError extends Error {
  constructor(email: string) {
    super(`We can't send emails to ${email} because it is not verified.`);
  }
}

export class MissingEmailUserError extends Error {
  constructor(userId: string) {
    super(
      `We can't send emails to user with id ${userId} because they don't exist.`,
    );
  }
}

const mailer = {
  transporter,
  /**
   * Send a transactional email to a user.
   * If a `userId` is given, this will confirm the user's email address is active before sending the message.
   * Otherwise if `email` is given, this verification will be bypassed.
   * @param email - The email to send along with the intended user.
   * @throws `EmailNotVerifiedError` - If the user's email is not verified or has previously bounced or complained.
   * @throws `MissingEmailAddressError` - If the user does not have an email address.
   */
  async sendEmail({ subject, text, html, ...options }: EmailOptions) {
    const childLogger = logger.child({ module: "mailer" });

    try {
      let email;
      let verified;

      if ("email" in options) {
        email = options.email;
        verified = false;
      } else {
        const userRequest = await query<{
          email: string;
          emailStatus: string;
        }>(
          `
        SELECT email, email_status AS "emailStatus" FROM users WHERE id = $1
        `,
          [options.userId],
        );
        const user = userRequest.rows[0];

        if (!user) {
          throw new MissingEmailUserError(options.userId);
        }
        if (user.emailStatus !== "VERIFIED") {
          throw new EmailNotVerifiedError(user.email);
        }
        email = user.email;
        verified = true;
      }

      await this.transporter.sendMail({
        from: process.env["EMAIL_FROM"],
        subject,
        text,
        html,
        to: email,
      });
      childLogger.info({ verified }, "Email sent");
    } catch (error) {
      childLogger.error({ err: error }, "Failed to send email");
      throw error;
    }
  },
};

export default mailer;

export async function sendEmailJob(job: Job<EmailOptions>) {
  await mailer.sendEmail(job.payload);
}
