import userQueryService from "../data-access/UserQueryService";
import { inviteUser } from "../use-cases/inviteUser";
import { PublicUserView } from "./types";

export const userClient = {
  async findOrInviteUser(email: string): Promise<string> {
    let user = await userQueryService.findByEmail(email);
    if (user) return user.id;

    const { userId } = await inviteUser({ email });
    return userId;
  },

  async findUserById(userId: string): Promise<PublicUserView | undefined> {
    let user = await userQueryService.findById(userId);
    if (!user) return;

    return {
      id: user.id,
      name: user.name ?? undefined,
      email: user.email,
    };
  },
};
