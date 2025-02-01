import { UserPolicyRepository } from "../data-access/types";
import { UnauthorizedError } from "../errors";
import UserPolicy, { Action, Resource } from "../model/UserPolicy";

export interface VerifyUserActionRequest<R extends Resource> extends Action<R> {
  userId?: string;
}

export default class VerifyUserAction {
  constructor(private readonly userPolicyRepo: UserPolicyRepository) {}

  async execute<R extends Resource>({
    userId,
    ...action
  }: VerifyUserActionRequest<R>): Promise<void> {
    const userPolicy =
      userId ?
        await this.userPolicyRepo.findByUserId(userId)
      : UserPolicy.Public;

    if (!userPolicy.verifyAction(action)) {
      throw new UnauthorizedError();
    }
  }
}
