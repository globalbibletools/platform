import { NotFoundError } from "@/shared/errors";
import userRepository from "../data-access/userRepository";
import mailer from "@/mailer";

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface ResetPasswordResponse {
  userId: string;
}

export async function resetPassword(
  request: ResetPasswordRequest,
): Promise<ResetPasswordResponse> {
  const user = await userRepository.findByResetPasswordToken(request.token);
  if (!user) throw new NotFoundError("User");

  await user.completePasswordReset(request.token, request.password);
  await userRepository.commit(user);

  await mailer.sendEmail({
    userId: user.id,
    subject: "Password Changed",
    text: `Your password for Global Bible Tools has changed.`,
    html: `Your password for Global Bible Tools has changed.`,
  });

  return { userId: user.id };
}
