import { getDb } from "@/db";
import { UserStatusRaw } from "@/modules/users/model/UserStatus";

export interface PlatformDashboardUserReadModel {
  id: string;
  name: string | null;
  email: string;
  status: "active" | "invited";
}

export async function getPlatformDashboardUsersReadModel(): Promise<
  PlatformDashboardUserReadModel[]
> {
  return getDb()
    .with("invited_user", (db) =>
      db.selectFrom("user_invitation").select("user_id").distinct(),
    )
    .selectFrom("users")
    .leftJoin("invited_user", "invited_user.user_id", "users.id")
    .where("users.status", "<>", UserStatusRaw.Disabled)
    .select([
      "users.id",
      "users.name",
      "users.email",
      (eb) =>
        eb
          .case()
          .when("invited_user.user_id", "is not", null)
          .then<"active" | "invited">("invited")
          .else<"active" | "invited">("active")
          .end()
          .as("status"),
    ])
    .orderBy("users.name")
    .orderBy("users.id")
    .execute();
}
