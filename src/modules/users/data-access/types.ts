import Invitation from "../model/Invitation";
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
