import { pool } from "@/db";
import UserPolicyRepository from "./data-access/UserPolicyRepository";
import UserPolicy, { Action, Resource } from "./model/UserPolicy";

export interface VerifyActionOptions<R extends Resource> extends Action<R> {
  userId?: string;
}

export async function canPerformAction<R extends Resource>({
  userId,
  ...action
}: VerifyActionOptions<R>): Promise<boolean> {
  const userPolicyRepo = new UserPolicyRepository(pool);
  const userPolicy =
    userId ? await userPolicyRepo.findByUserId(userId) : UserPolicy.Public;

  return userPolicy.verifyAction(action);
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
  }
}

export async function verifyAction<R extends Resource>(
  action: VerifyActionOptions<R>,
): Promise<void> {
  if (!canPerformAction(action)) {
    throw new UnauthorizedError();
  }
}
