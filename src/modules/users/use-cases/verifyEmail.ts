import mailer from "@/mailer";
import userRepository from "../data-access/userRepository";
import { InvalidEmailVerificationToken } from "../model/errors";

export interface VerifyEmailRequest {
  token: string;
}

export async function verifyEmail(request: VerifyEmailRequest): Promise<void> {
  const user = await userRepository.findByEmailVerificationToken(request.token);
  if (!user) {
    throw new InvalidEmailVerificationToken();
  }

  user.confirmEmailChange(request.token);

  await userRepository.commit(user);

  await mailer.sendEmail({
    userId: user.id,
    subject: "Email Changed",
    text: `Your email address for Global Bible Tools was changed to ${user.email.address}.`,
    html: `Your email address for Global Bible Tools was changed to <strong>${user.email.address}</strong>.`,
  });
}
