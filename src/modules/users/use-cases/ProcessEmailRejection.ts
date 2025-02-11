import { UserRepository } from "../data-access/types";
import EmailStatus, { EmailStatusRaw } from "../model/EmailStatus";

export interface ProcessEmailRejectionRequest {
  email: string;
  reason: EmailStatusRaw;
}

export default class ProcessEmailRejection {
  constructor(private readonly userRepo: UserRepository) {}

  async execute(request: ProcessEmailRejectionRequest): Promise<void> {
    const user = await this.userRepo.findByEmail(request.email);
    if (!user) return;

    user.rejectEmail(EmailStatus.fromRaw(request.reason));

    await this.userRepo.commit(user);
  }
}
