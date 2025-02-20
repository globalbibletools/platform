import { UserRepository } from "../data-access/types";
import { NotFoundError } from "@/shared/errors";
import SystemRole, { SystemRoleRaw } from "../model/SystemRole";

export interface ChangeUserRolesRequest {
  userId: string;
  roles: SystemRoleRaw[];
}

export default class ChangeUserRoles {
  constructor(private readonly userRepo: UserRepository) {}

  async execute(request: ChangeUserRolesRequest): Promise<void> {
    const user = await this.userRepo.findById(request.userId);
    if (!user) throw new NotFoundError("User");

    user.changeSystemRoles(
      request.roles.map((role) => SystemRole.fromRaw(role)),
    );
    await this.userRepo.commit(user);
  }
}
