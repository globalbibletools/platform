import { ulid } from "@/shared/ulid";
import { beforeEach } from "vitest";

interface User {
  id: string;
  email: string;
}

const fakeUserClient = {
  users: [] as User[],

  reset() {
    this.users = [];
  },

  async findOrInviteUser(email: string): Promise<string> {
    let user = this.users.find((u) => u.email === email.toLowerCase());
    if (user) return user.id;

    user = {
      id: ulid(),
      email: email.toLowerCase(),
    };
    this.users.push(user);
    return user.id;
  },
};
export default fakeUserClient;

beforeEach(() => {
  fakeUserClient.reset();
});
