import { UserRepository } from "../data-access/types";
import { InvalidInvitationTokenError } from "../model/errors";

export interface AcceptInviteRequest {
  token: string;
  firstName: string;
  lastName: string;
  password: string;
}

export interface AcceptInviteResponse {
  userId: string;
}

export default class AcceptInvite {
  constructor(private readonly userRepo: UserRepository) {}

  async execute(request: AcceptInviteRequest): Promise<AcceptInviteResponse> {
    const user = await this.userRepo.findByInvitationToken(request.token);
    if (!user) {
      throw new InvalidInvitationTokenError();
    }

    await user.acceptInvite(request);

    await this.userRepo.commit(user);

    return { userId: user.id };
  }
}
