import { enqueueJob } from "@/shared/jobs/enqueueJob";
import userRepository from "../data-access/userRepository";

export interface StartPasswordResetRequest {
  email: string;
}

export async function startPasswordReset(
  request: StartPasswordResetRequest,
): Promise<void> {
  const user = await userRepository.findByEmail(request.email);
  if (!user) return;

  let reset;
  try {
    reset = user.startPasswordReset();
  } catch {
    // Swallow these errors to not leak user data to attackers.
    return;
  }

  await userRepository.commit(user);

  const url = `${process.env.ORIGIN}/reset-password?token=${reset.token}`;
  await enqueueJob("send_email", {
    email: user.email.address,
    subject: "Reset Password",
    text: `Please click the following link to reset your password\n\n${url}`,
    html: `<a href="${url}">Click here</a> to reset your password`,
  });
}
