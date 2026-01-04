import mailer from "@/mailer";
import userRepository from "../data-access/userRepository";
import User from "../model/User";

export interface InviteUserRequest {
  email: string;
}

export interface InviteUserResponse {
  userId: string;
}

export async function inviteUser(
  request: InviteUserRequest,
): Promise<InviteUserResponse> {
  let token;

  let user = await userRepository.findByEmail(request.email);
  if (user) {
    token = user.reinvite();
  } else {
    const result = User.invite(request.email);
    user = result.user;
    token = result.token;
  }

  await userRepository.commit(user);

  const url = `${process.env.ORIGIN}/invite?token=${token}`;
  await mailer.sendEmail({
    email: user.email.address,
    subject: "GlobalBibleTools Invite",
    text: `You've been invited to globalbibletools.com. Click the following to accept your invite and get started.\n\n${url.toString()}`,
    html: `You've been invited to globalbibletools.com. <a href="${url.toString()}">Click here<a/> to accept your invite and get started.`,
  });

  return { userId: user.id };
}
