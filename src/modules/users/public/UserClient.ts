import userQueryService from "../data-access/UserQueryService";
import userRepository from "../data-access/UserRepository";
import InviteUser from "../use-cases/InviteUser";
import { PublicUserView } from "./types";

const inviteUserUseCase = new InviteUser(userRepository);

export const userClient = {
  async findOrInviteUser(email: string): Promise<string> {
    let user = await userQueryService.findByEmail(email);
    if (user) return user.id;

    const { userId } = await inviteUserUseCase.execute({ email });
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
