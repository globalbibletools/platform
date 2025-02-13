import { beforeEach } from "vitest";
import User from "../model/User";

const mockUserRepo = {
  users: [] as User[],

  reset() {
    this.users = [];
  },

  async existsByEmail(email: string): Promise<boolean> {
    return this.users.some((u) => u.email.address === email.toLowerCase());
  },

  async findById(id: string): Promise<User | undefined> {
    return this.users.find((u) => u.id === id);
  },
  async findByEmail(email: string): Promise<User | undefined> {
    return this.users.find((u) => u.email.address === email);
  },
  async findByResetPasswordToken(token: string): Promise<User | undefined> {
    return this.users.find((u) =>
      u.passwordResets.some((reset) => reset.token === token),
    );
  },
  async findByEmailVerificationToken(token: string): Promise<User | undefined> {
    return this.users.find((u) => u.emailVerification?.token === token);
  },
  async findByInvitationToken(token: string): Promise<User | undefined> {
    return this.users.find((u) =>
      u.invitations.some((invite) => invite?.token === token),
    );
  },

  async commit(user: User): Promise<void> {
    if (this.users.includes(user)) return;

    this.users.push(user);
  },
};
export default mockUserRepo;

beforeEach(() => {
  mockUserRepo.reset();
});
