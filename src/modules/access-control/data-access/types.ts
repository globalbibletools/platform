import UserPolicy from "../model/UserPolicy";
import UserSystemAccess from "../model/UserSystemAccess";

export interface UserSystemAccessRepository {
  findByUserId(userId: string): Promise<UserSystemAccess>;
  commit(model: UserSystemAccess): Promise<void>;
}

export interface UserPolicyRepository {
  findByUserId(userId: string): Promise<UserPolicy>;
}
