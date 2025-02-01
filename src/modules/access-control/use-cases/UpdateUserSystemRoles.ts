import { UserPolicyRepository } from "../data-access/types";
import SystemRole, { SystemRoleValue } from "../model/SystemRole";

interface UpdateUserSystemRolesRequest {
  userId: string;
  systemRoles: SystemRoleValue[];
}

export default class UpdateUserSystemRoles {
  constructor(private readonly userPolicyRepo: UserPolicyRepository) {}

  async execute(request: UpdateUserSystemRolesRequest): Promise<void> {
    const userPolicy = await this.userPolicyRepo.findByUserId(request.userId);

    userPolicy.replaceSystemRoles(request.systemRoles.map(SystemRole.fromRaw));

    await this.userPolicyRepo.commit(userPolicy);
  }
}
