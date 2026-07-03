import mailer from "@/shared/email";
import userRepository from "../data-access/userRepository";
import User from "../model/User";

export interface InviteUserRequest {
  email: string;
}

export interface InviteUserResponse {
  userId: string;
  alreadyActive: boolean;
}

export async function inviteUser(
  request: InviteUserRequest,
): Promise<InviteUserResponse> {
  let token;
  let user = await userRepository.findByEmail(request.email);
  if (!user) {
    const result = User.invite(request.email);
    user = result.user;
    token = result.token;
  } else if (!user.isActive()) {
    token = user.reinvite();
  }

  if (token) {
    await userRepository.commit(user);

    const url = `${process.env.ORIGIN}/invite?token=${token}`;
    await mailer.sendEmail({
      email: user.email.address,
      subject: "GlobalBibleTools Invite",
      text: `You've been invited to globalbibletools.com. Click the following to accept your invite and get started.\n\n${url.toString()}`,
      html: `You've been invited to globalbibletools.com. <a href="${url.toString()}">Click here<a/> to accept your invite and get started.`,
    });

    return { userId: user.id, alreadyActive: false };
  }

  return { userId: user.id, alreadyActive: true };
}
