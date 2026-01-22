import { jsonBuildObject } from "kysely/helpers/postgres";
import { getDb } from "@/db";
import { UserStatusRaw } from "../model/UserStatus";
import { sql } from "kysely";
import { SystemRoleRaw } from "../model/SystemRole";
import { EmailStatusRaw } from "../model/EmailStatus";

export interface UserReadModel {
  id: string;
  name: string | null;
  email: string;
  emailStatus: EmailStatusRaw;
  roles: Array<SystemRoleRaw>;
  invite: { token: string } | null;
}

export interface UserPageReadModel {
  total: number;
  page: UserReadModel[];
}

export interface SearchUserOptions {
  page: number;
  limit: number;
}

export async function searchUsersReadModel(
  options: SearchUserOptions,
): Promise<UserPageReadModel> {
  const query = getDb()
    .with("filtered_users", (db) =>
      db
        .selectFrom("users")
        .selectAll()
        .where("users.status", "<>", UserStatusRaw.Disabled),
    )
    .selectNoFrom(({ selectFrom }) => [
      selectFrom("filtered_users")
        .select((eb) => eb.fn.countAll().as("total"))
        .$narrowType<{ total: number }>()
        .as("total"),
      selectFrom("filtered_users")
        .innerJoinLateral(
          (eb) =>
            eb
              .selectFrom("user_system_role")
              .whereRef("user_id", "=", "filtered_users.id")
              .select((eb) => eb.fn.jsonAgg("user_system_role.role").as("list"))
              .as("roles"),
          (jb) => jb.onTrue(),
        )
        .leftJoinLateral(
          (eb) =>
            eb
              .selectFrom("user_invitation")
              .whereRef("user_id", "=", "filtered_users.id")
              .orderBy("expires", "desc")
              .limit(1)
              .select((eb) =>
                jsonBuildObject({
                  token: eb.ref("token"),
                }).as("obj"),
              )
              .as("invite"),
          (jb) => jb.onTrue(),
        )
        .offset(options.page * options.limit)
        .limit(options.limit)
        .select((eb) =>
          eb.fn
            .jsonAgg(
              jsonBuildObject({
                id: eb.ref("id"),
                name: eb.ref("name"),
                email: eb.ref("email"),
                emailStatus: eb.ref("email_status"),
                roles: eb.fn.coalesce(
                  "roles.list",
                  sql<Array<SystemRoleRaw>>`'[]'::json`,
                ),
                invite: eb.ref("invite.obj"),
              }),
            )
            .orderBy("name")
            .as("page"),
        )
        .as("page"),
    ]);

  const result = await query.executeTakeFirstOrThrow();
  return {
    total: result.total ?? 0,
    page: result.page ?? [],
  };
}
