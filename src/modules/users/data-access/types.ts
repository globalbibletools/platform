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

export interface InviteView {
  token: string;
  email: string;
}

export interface UserQueryService {
  resetPasswordTokenExists(token: string): Promise<boolean>;
  findInviteByToken(token: string): Promise<InviteView | undefined>;

  findByEmail(email: string): Promise<SimpleUserView | undefined>;
}
