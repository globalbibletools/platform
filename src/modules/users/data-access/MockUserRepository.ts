import { beforeEach } from "vitest";
import User from "../model/User";

const mockUserRepo = {
  users: [] as User[],

  reset() {
    this.users = [];
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

  async commit(user: User): Promise<void> {},
};
export default mockUserRepo;

beforeEach(() => {
  mockUserRepo.reset();
});
