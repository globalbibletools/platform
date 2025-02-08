import { NotFoundError } from "@/shared/errors";
import { UserRepository } from "../data-access/types";
import mailer, { EmailOptions } from "@/mailer";
import UserAuthentication from "../model/UserAuthentication";

export interface UpdateProfileRequest {
  id: string;
  name: string;
  email: string;
  password?: string;
}

export default class UpdateProfile {
  constructor(private readonly userRepo: UserRepository) {}

  async execute(request: UpdateProfileRequest): Promise<void> {
    const user = await this.userRepo.findById(request.id);
    if (!user) throw new NotFoundError("User");

    user.updateName(request.name);

    const emails: EmailOptions[] = [];

    if (request.email !== user.email.address) {
      user.updateEmail(user.email.initiateEmailChange(request.email));

      const url = `${process.env.ORIGIN}/verify-email?token=${user.email.verification?.token}`;
      emails.push({
        email: request.email,
        subject: "Email Verification",
        text: `Please click the link to verify your new email\n\n${url.toString()}`,
        html: `<a href="${url.toString()}">Click here</a> to verify your new email.`,
      });
    }

    if (request.password) {
      user.updateAuth(
        await UserAuthentication.createPassword(request.password),
      );

      emails.push({
        userId: user.id,
        subject: "Password Changed",
        text: `Your password for Global Bible Tools has changed.`,
        html: `Your password for Global Bible Tools has changed.`,
      });
    }

    await this.userRepo.commit(user);

    await Promise.all(emails.map((email) => mailer.sendEmail(email)));
  }
}
