import mailer from "@/mailer";
import { UserRepository } from "../data-access/types";
import { InvalidEmailVerificationToken } from "../model/errors";

export interface VerifyEmailRequest {
  token: string;
}

export default class VerifyEmail {
  constructor(private readonly userRepo: UserRepository) {}

  async execute(request: VerifyEmailRequest): Promise<void> {
    const user = await this.userRepo.findByEmailVerificationToken(
      request.token,
    );
    if (!user) {
      throw new InvalidEmailVerificationToken();
    }

    user.confirmEmailChange(request.token);

    await this.userRepo.commit(user);

    await mailer.sendEmail({
      userId: user.id,
      subject: "Email Changed",
      text: `Your email address for Global Bible Tools was changed to ${user.email.address}.`,
      html: `Your email address for Global Bible Tools was changed to <strong>${user.email.address}</strong>.`,
    });
  }
}
