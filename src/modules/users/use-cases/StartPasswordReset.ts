import { NotFoundError } from "@/shared/errors";
import { UserRepository } from "../data-access/types";
import mailer, { EmailOptions } from "@/mailer";
import Password from "../model/Password";

export interface StartPasswordResetRequest {
  email: string;
}

export default class StartPasswordReset {
  constructor(private readonly userRepo: UserRepository) {}

  async execute(request: StartPasswordResetRequest): Promise<void> {
    const user = await this.userRepo.findByEmail(request.email);
    if (!user) return;

    const reset = user.startPasswordReset();

    await this.userRepo.commit(user);

    const url = `${process.env.ORIGIN}/reset-password?token=${reset.token}`;
    await mailer.sendEmail({
      email: user.email.address,
      subject: "Reset Password",
      text: `Please click the following link to reset your password\n\n${url}`,
      html: `<a href="${url}">Click here</a> to reset your password`,
    });
  }
}
