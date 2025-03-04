import { cookies } from "@/tests/mocks/nextjs";
import { test, expect } from "vitest";
import {
  findLanguages,
  initializeDatabase,
  seedDatabase,
} from "@/tests/dbUtils";
import { createLanguage } from "./createLanguage";
import { ulid } from "@/shared/ulid";
import { EmailStatusRaw } from "@/modules/users/model/EmailStatus";
import { UserStatusRaw } from "@/modules/users/model/UserStatus";
import { addDays } from "date-fns";
import { TextDirectionRaw } from "../model";

initializeDatabase();

const admin = {
  id: ulid(),
  hashedPassword: "password hash",
  name: "Test User",
  email: "test@example.com",
  emailStatus: EmailStatusRaw.Verified,
  status: UserStatusRaw.Active,
};

const adminRole = {
  userId: admin.id,
  role: "ADMIN",
};

const session = {
  id: ulid(),
  userId: admin.id,
  expiresAt: addDays(new Date(), 1),
};

test("returns validation error if the request shape doesn't match the schema", async () => {
  await seedDatabase({
    users: [admin],
    systemRoles: [adminRole],
    sessions: [session],
  });
  cookies.get.mockReturnValue({ value: session.id });

  {
    const formData = new FormData();
    const response = await createLanguage({ state: "idle" }, formData);
    expect(response).toEqual({
      state: "error",
      validation: {
        code: ["The language code must be 3 characters."],
        name: ["Please enter the language name."],
      },
    });
  }
  {
    const formData = new FormData();
    formData.set("code", "");
    formData.set("name", "");
    const response = await createLanguage({ state: "idle" }, formData);
    expect(response).toEqual({
      state: "error",
      validation: {
        code: ["The language code must be 3 characters."],
        name: ["Please enter the language name."],
      },
    });
  }
});

test("returns not found if the user is not a platform admin", async () => {
  // Don't set up the admin role on the user
  await seedDatabase({
    users: [admin],
    sessions: [session],
  });

  cookies.get.mockReturnValue({ value: session.id });

  const formData = new FormData();
  formData.set("code", "spa");
  formData.set("name", "Spanish");
  const response = createLanguage({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();
});

test("returns error if language with the same code already exists", async () => {
  const existingLanguage = {
    id: ulid(),
    code: "spa",
    name: "Spanish",
    font: "Noto Sans",
    textDirection: TextDirectionRaw.LTR,
    translationIds: [],
  };
  await seedDatabase({
    users: [admin],
    systemRoles: [adminRole],
    sessions: [session],
    languages: [existingLanguage],
  });
  cookies.get.mockReturnValue({ value: session.id });

  const formData = new FormData();
  formData.set("code", "spa");
  formData.set("name", "Spanish");
  const response = await createLanguage({ state: "idle" }, formData);
  expect(response).toEqual({
    state: "error",
    error: "This language already exists.",
  });
});

test("creates language and redirects to its settings", async () => {
  await seedDatabase({
    users: [admin],
    systemRoles: [adminRole],
    sessions: [session],
  });
  cookies.get.mockReturnValue({ value: session.id });

  const request = {
    code: "spa",
    name: "Spanish",
  };
  const formData = new FormData();
  formData.set("code", request.code);
  formData.set("name", request.name);
  const response = createLanguage({ state: "idle" }, formData);
  await expect(response).toBeNextjsRedirect(
    `/en/admin/languages/${request.code}/settings`,
  );

  const languages = await findLanguages();
  expect(languages).toEqual([
    {
      id: expect.toBeUlid(),
      name: request.name,
      code: request.code,
      font: "Noto Sans",
      textDirection: TextDirectionRaw.LTR,
      translationIds: [],
      gtSourceLanguage: "en",
    },
  ]);
});
