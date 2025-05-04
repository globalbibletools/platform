import { DbSystemRole, DbUser } from "@/modules/users/data-access/types";
import { SystemRoleRaw } from "@/modules/users/model/SystemRole";
import {
  systemRoleFactory,
  userFactory,
} from "@/modules/users/test-utils/factories";

export async function createSystemAdmin(): Promise<{
  user: DbUser;
  role: DbSystemRole;
}> {
  const user = await userFactory.build();
  const role = await systemRoleFactory.build({
    userId: user.id,
    role: SystemRoleRaw.Admin,
  });

  return { user, role };
}

export async function createTranslator(): Promise<{ user: DbUser }> {
  const user = await userFactory.build();

  return { user };
}
