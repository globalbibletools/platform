import { NotFoundError } from "@/shared/errors";
import { UserRepository } from "../data-access/types";
import mailer from "@/mailer";

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface ResetPasswordResponse {
  userId: string;
}

export default class ResetPassword {
  constructor(private readonly userRepo: UserRepository) {}

  async execute(request: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    const user = await this.userRepo.findByResetPasswordToken(request.token);
    if (!user) throw new NotFoundError("User");

    await user.completePasswordReset(request.token, request.password);
    await this.userRepo.commit(user);

    await mailer.sendEmail({
      userId: user.id,
      subject: "Password Changed",
      text: `Your password for Global Bible Tools has changed.`,
      html: `Your password for Global Bible Tools has changed.`,
    });

    return { userId: user.id };
  }
}
