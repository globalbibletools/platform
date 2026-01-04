import userRepository from "../data-access/userRepository";
import { NotFoundError } from "@/shared/errors";
import SystemRole, { SystemRoleRaw } from "../model/SystemRole";

export interface ChangeUserRolesRequest {
  userId: string;
  roles: SystemRoleRaw[];
}

export async function changeUserRoles(
  request: ChangeUserRolesRequest,
): Promise<void> {
  const user = await userRepository.findById(request.userId);
  if (!user) throw new NotFoundError("User");

  user.changeSystemRoles(request.roles.map((role) => SystemRole.fromRaw(role)));
  await userRepository.commit(user);
}
