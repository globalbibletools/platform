import userQueryService from "../data-access/UserQueryService";
import userRepository from "../data-access/UserRepository";
import InviteUser from "../use-cases/InviteUser";

const inviteUserUseCase = new InviteUser(userRepository);

export const userClient = {
  async findOrInviteUser(email: string): Promise<string> {
    let user = await userQueryService.findByEmail(email);
    if (user) return user.id;

    const { userId } = await inviteUserUseCase.execute({ email });
    return userId;
  },
};
