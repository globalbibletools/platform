import "@/tests/vitest/mocks/nextjs";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { test, expect } from "vitest";
import { logout } from "./logout";
import { userFactory } from "../test-utils/userFactory";
import { findSessionsForUser } from "../test-utils/dbUtils";
import logIn from "@/tests/vitest/login";

initializeDatabase();

test("clears the current session", async () => {
  const { user } = await userFactory.build();
  await logIn(user.id);

  expect(await findSessionsForUser(user.id)).toHaveLength(1);

  await logout();

  expect(await findSessionsForUser(user.id)).toEqual([]);
});
