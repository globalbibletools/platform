import { ulid } from "@/shared/ulid";
import { beforeEach } from "vitest";
import { PublicUserView } from "./types";

interface User {
  id: string;
  name: string | null;
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
      name: null,
    };
    this.users.push(user);
    return user.id;
  },

  async findUserById(id: string): Promise<PublicUserView | undefined> {
    let user = this.users.find((u) => u.id === id);
    if (!user) return;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
    };
  },
};
export default fakeUserClient;

beforeEach(() => {
  fakeUserClient.reset();
});
