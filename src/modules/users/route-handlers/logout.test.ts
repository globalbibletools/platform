import { cookies } from "@/tests/mocks/nextjs";
import { initializeDatabase } from "@/tests/dbUtils";
import { test, expect } from "vitest";
import handleLogout from "./logout";

initializeDatabase();

test("redirects to login if there is no session", async () => {
  const result = handleLogout({} as Request);
  await expect(result).rejects.toBeNextjsRedirect("/en/login");
  expect(cookies.delete).not.toHaveBeenCalled();
});

test("clears the session and redirects to login", async () => {
  cookies.get.mockReturnValue({ value: "session-id" });

  const result = handleLogout({} as Request);
  await expect(result).rejects.toBeNextjsRedirect("/en/login");
  expect(cookies.delete).toHaveBeenCalledExactlyOnceWith("session");
});
