import { Generated } from "kysely";
import { EmailStatusRaw } from "../model/EmailStatus";
import { SystemRoleRaw } from "../model/SystemRole";
import User from "../model/User";
import { UserStatusRaw } from "../model/UserStatus";

export interface UserTable {
  id: Generated<string>;
  name: string | null;
  email_status: Generated<EmailStatusRaw>;
  email: string;
  hashed_password: string | null;
  status: Generated<UserStatusRaw>;
}

export interface ResetPasswordTokenTable {
  user_id: string;
  token: string;
  expires: number;
}

export interface UserEmailVerificationTable {
  user_id: string;
  email: string;
  token: string;
  expires: number;
}

export interface UserInvitationTable {
  user_id: string;
  token: string;
  expires: number;
}

export interface UserSystemRoleTable {
  user_id: string;
  role: SystemRoleRaw;
}

export interface SessionTable {
  id: string;
  user_id: string;
  expires_at: Date;
}

export interface DbUser {
  id: string;
  name?: string | null;
  email: string;
  emailStatus: EmailStatusRaw;
  hashedPassword?: string | null;
  status: UserStatusRaw;
}

export interface DbPasswordReset {
  userId: string;
  token: string;
  expiresAt: Date;
}

export interface DbEmailVerification {
  userId: string;
  email: string;
  token: string;
  expiresAt: Date;
}

export interface DbInvitation {
  userId: string;
  token: string;
  expiresAt: Date;
}

export interface DbSystemRole {
  userId: string;
  role: SystemRoleRaw;
}

export interface DbSession {
  id: string;
  userId: string;
  expiresAt: Date;
}

export interface UserRepository {
  existsByEmail(email: string): Promise<boolean>;
  findById(id: string): Promise<User | undefined>;
  findByEmail(email: string): Promise<User | undefined>;
  findByResetPasswordToken(token: string): Promise<User | undefined>;
  findByEmailVerificationToken(token: string): Promise<User | undefined>;
  findByInvitationToken(token: string): Promise<User | undefined>;
  commit(user: User): Promise<void>;
}

export type SimpleUserView = Pick<DbUser, "id" | "name" | "email">;
export type SearchUserView = Pick<
  DbUser,
  "id" | "name" | "email" | "emailStatus"
> & {
  roles: DbSystemRole["role"][];
  invite: null | Omit<DbInvitation, "userId">;
};

export interface SearchUserPageView {
  total: number;
  page: SearchUserView[];
}

export interface SearchUserOptions {
  page: number;
  limit: number;
}

export interface UserQueryService {
  findByEmail(email: string): Promise<SimpleUserView | undefined>;
  findById(id: string): Promise<SimpleUserView | undefined>;
  search(options: SearchUserOptions): Promise<SearchUserPageView>;
}
