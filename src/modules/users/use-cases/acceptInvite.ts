import userRepository from "../data-access/userRepository";
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

export async function acceptInvite(
  request: AcceptInviteRequest,
): Promise<AcceptInviteResponse> {
  const user = await userRepository.findByInvitationToken(request.token);
  if (!user) {
    throw new InvalidInvitationTokenError();
  }

  await user.acceptInvite(request);

  await userRepository.commit(user);

  return { userId: user.id };
}
