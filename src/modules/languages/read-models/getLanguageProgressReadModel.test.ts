import { test, expect } from "vitest";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { getLanguageProgressReadModel } from "./getLanguageProgressReadModel";

initializeDatabase();

test("returns empty array if the language does not exist", async () => {
  const result = await getLanguageProgressReadModel("nonexistent-code");
  expect(result).toEqual([]);
});

// TODO: build the test once there is an easy way to insert verses and glosses.
test.todo("returns language progress by code when it exists");
