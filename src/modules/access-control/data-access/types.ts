import UserPolicy from "../model/UserPolicy";

export interface UserPolicyRepository {
  findByUserId(userId: string): Promise<UserPolicy>;
  commit(model: UserPolicy): Promise<void>;
}
