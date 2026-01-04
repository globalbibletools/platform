import { NotFoundError } from "@/shared/errors";
import userRepository from "../data-access/userRepository";
import mailer, { EmailOptions } from "@/mailer";
import Password from "../model/Password";

export interface UpdateProfileRequest {
  id: string;
  name: string;
  email: string;
  password?: string;
}

export async function updateProfile(
  request: UpdateProfileRequest,
): Promise<void> {
  const user = await userRepository.findById(request.id);
  if (!user) throw new NotFoundError("User");

  user.updateName(request.name);

  const emails: EmailOptions[] = [];

  if (request.email !== user.email.address) {
    const verification = user.startEmailChange(request.email);

    const url = `${process.env.ORIGIN}/verify-email?token=${verification.token}`;
    emails.push({
      email: request.email,
      subject: "Email Verification",
      text: `Please click the link to verify your new email\n\n${url.toString()}`,
      html: `<a href="${url.toString()}">Click here</a> to verify your new email.`,
    });
  }

  if (request.password) {
    user.updatePassword(await Password.create(request.password));

    emails.push({
      userId: user.id,
      subject: "Password Changed",
      text: `Your password for Global Bible Tools has changed.`,
      html: `Your password for Global Bible Tools has changed.`,
    });
  }

  await userRepository.commit(user);

  await Promise.all(emails.map((email) => mailer.sendEmail(email)));
}
