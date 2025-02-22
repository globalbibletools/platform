import { EmailStatusRaw } from "../model/EmailStatus";
import { SystemRoleRaw } from "../model/SystemRole";
import User from "../model/User";

export interface UserRepository {
  existsByEmail(email: string): Promise<boolean>;
  findById(id: string): Promise<User | undefined>;
  findByEmail(email: string): Promise<User | undefined>;
  findByResetPasswordToken(token: string): Promise<User | undefined>;
  findByEmailVerificationToken(token: string): Promise<User | undefined>;
  findByInvitationToken(token: string): Promise<User | undefined>;
  commit(user: User): Promise<void>;
}

export interface SimpleUserView {
  id: string;
}

export interface UserProfileView {
  id: string;
  email: string;
  name?: string;
}

export interface InviteView {
  token: string;
  email: string;
}

export interface SearchUsersOptions {
  page: number;
  limit: number;
}

export interface SearchUser {
  id: string;
  name?: string;
  email: string;
  emailStatus: EmailStatusRaw;
  roles: SystemRoleRaw[];
  invite?: {
    token: string;
    expires: number;
  };
}

export interface SearchUsersView {
  page: SearchUser[];
  total: number;
}

export interface UserQueryService {
  resetPasswordTokenExists(token: string): Promise<boolean>;
  findInviteByToken(token: string): Promise<InviteView | undefined>;

  searchUsers(options: SearchUsersOptions): Promise<SearchUsersView>;
  findByEmail(email: string): Promise<SimpleUserView | undefined>;
  findProfileById(id: string): Promise<UserProfileView | undefined>;
}
