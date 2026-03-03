import { Async } from "factory.ts";
import { DbSession } from "../data-access/types";
import { faker } from "@faker-js/faker/locale/en";
import { ulid } from "@/shared/ulid";
import { query } from "@/db";

export const sessionFactory = Async.makeFactoryWithRequired<
  DbSession,
  "userId"
>({
  id: Async.each(() => ulid()),
  expiresAt: Async.each(() => faker.date.soon()),
}).transform(async (session) => {
  await query(
    `
      insert into session (id, user_id, expires_at)
      values ($1, $2, $3)
    `,
    [session.id, session.userId, session.expiresAt],
  );
  return session;
});
