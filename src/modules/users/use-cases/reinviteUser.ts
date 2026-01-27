import mailer from "@/mailer";
import userRepository from "../data-access/userRepository";
import { NotFoundError } from "@/shared/errors";

export interface ReinviteUserRequest {
  userId: string;
}

export async function reinviteUser(
  request: ReinviteUserRequest,
): Promise<void> {
  const user = await userRepository.findById(request.userId);
  if (!user) {
    throw new NotFoundError("User");
  }

  const token = user.reinvite();
  await userRepository.commit(user);

  const url = `${process.env.ORIGIN}/invite?token=${token}`;
  await mailer.sendEmail({
    email: user.email.address,
    subject: "GlobalBibleTools Invite",
    text: `You've been invited to globalbibletools.com. Click the following to accept your invite and get started.\n\n${url.toString()}`,
    html: `You've been invited to globalbibletools.com. <a href="${url.toString()}">Click here<a/> to accept your invite and get started.`,
  });
}
