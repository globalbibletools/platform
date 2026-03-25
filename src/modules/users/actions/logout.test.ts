import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { test, expect } from "vitest";
import { runServerFn } from "@/tests/vitest/serverFnHarness";
import { logout } from "./logout";
import { userFactory } from "../test-utils/userFactory";
import { findSessionsForUser } from "../test-utils/dbUtils";

initializeDatabase();

test("clears the current session", async () => {
  const { user, session } = await userFactory.build({ session: true });

  const { response } = await runServerFn(logout, {
    sessionId: session!.id,
  });

  expect(response.status).toEqual(204);
  expect(response.headers.get("set-cookie")).toBe(
    "session=; Max-Age=0; Path=/",
  );

  expect(await findSessionsForUser(user.id)).toEqual([]);
});
