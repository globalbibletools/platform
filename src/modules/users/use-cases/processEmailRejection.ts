import userRepository from "../data-access/userRepository";
import EmailStatus, { EmailStatusRaw } from "../model/EmailStatus";

export interface ProcessEmailRejectionRequest {
  email: string;
  reason: EmailStatusRaw;
}

export async function processEmailRejection(
  request: ProcessEmailRejectionRequest,
): Promise<void> {
  const user = await userRepository.findByEmail(request.email);
  if (!user) return;

  user.rejectEmail(EmailStatus.fromRaw(request.reason));

  await userRepository.commit(user);
}
