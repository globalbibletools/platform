import userPolicyRepo from "./data-access/UserPolicyRepository";
import { Resource } from "./model/UserPolicy";
import VerifyUserAction, {
  VerifyUserActionRequest,
} from "./use-cases/VerifyUserAction";

export async function verifyAction<R extends Resource>(
  action: VerifyUserActionRequest<R>,
): Promise<void> {
  const verifyUserAction = new VerifyUserAction(userPolicyRepo);
  await verifyUserAction.execute(action);
}
