import { faker } from "@faker-js/faker/locale/en";
import { getDb } from "@/db";
import { ulid } from "@/shared/ulid";
import type { Selectable } from "kysely";
import type { SessionTable } from "../data-access/types";

export const sessionFactory = {
  async build(userId: string): Promise<Selectable<SessionTable>> {
    const db = getDb();
    return db
      .insertInto("session")
      .values({
        id: ulid(),
        user_id: userId,
        expires_at: faker.date.soon(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  },
};
