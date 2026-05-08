import { getDb } from "@/db";
import { UserStatusRaw } from "@/modules/users/model/UserStatus";

export interface PlatformDashboardUserReadModel {
  id: string;
  name: string | null;
  email: string;
}

export async function getPlatformDashboardUsersReadModel(): Promise<
  PlatformDashboardUserReadModel[]
> {
  return getDb()
    .selectFrom("users")
    .where("users.status", "<>", UserStatusRaw.Disabled)
    .select(["users.id", "users.name", "users.email"])
    .orderBy("users.name")
    .orderBy("users.id")
    .execute();
}
