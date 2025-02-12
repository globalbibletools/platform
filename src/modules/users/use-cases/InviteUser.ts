import mailer from "@/mailer";
import { UserRepository } from "../data-access/types";
import User from "../model/User";
import { EmailAlreadyUsedError } from "../model/errors";

export interface InviteUserRequest {
  email: string;
}

export interface InviteUserResponse {
  userId: string;
}

export default class InviteUser {
  constructor(private readonly userRepo: UserRepository) {}

  async execute(request: InviteUserRequest): Promise<InviteUserResponse> {
    const exists = await this.userRepo.existsByEmail(request.email);
    if (exists) {
      throw new EmailAlreadyUsedError(request.email.toLowerCase());
    }

    const { user, token } = User.invite(request.email);
    await this.userRepo.commit(user);

    const url = `${process.env.ORIGIN}/invite?token=${token}`;
    await mailer.sendEmail({
      email: user.email.address,
      subject: "GlobalBibleTools Invite",
      text: `You've been invited to globalbibletools.com. Click the following to accept your invite and get started.\n\n${url.toString()}`,
      html: `You've been invited to globalbibletools.com. <a href="${url.toString()}">Click here<a/> to accept your invite and get started.`,
    });

    return { userId: user.id };
  }
}
