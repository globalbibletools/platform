import { cookies } from "@/tests/vitest/mocks/nextjs";
import { test, expect } from "vitest";
import {
  findLanguages,
  initializeDatabase,
  seedDatabase,
} from "@/tests/vitest/dbUtils";
import { ulid } from "@/shared/ulid";
import { EmailStatusRaw } from "@/modules/users/model/EmailStatus";
import { UserStatusRaw } from "@/modules/users/model/UserStatus";
import { addDays } from "date-fns";
import { updateLanguageSettings } from "./updateLanguageSettings";
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
    const response = await updateLanguageSettings({ state: "idle" }, formData);
    expect(response).toEqual({
      state: "error",
      validation: {
        code: ["Invalid"],
        name: ["Please enter the language name."],
        font: ["Please select a font."],
        textDirection: ["Please select a text direction."],
      },
    });
  }
  {
    const formData = new FormData();
    formData.set("code", "spa");
    formData.set("name", "");
    formData.set("font", "");
    formData.set("text_direction", TextDirectionRaw.LTR);
    const response = await updateLanguageSettings({ state: "idle" }, formData);
    expect(response).toEqual({
      state: "error",
      validation: {
        name: ["Please enter the language name."],
        font: ["Please select a font."],
      },
    });
  }
});

test("returns not found if the user is not a platform or language admin", async () => {
  // Don't set up the admin role on the user
  await seedDatabase({
    users: [admin],
    sessions: [session],
  });

  cookies.get.mockReturnValue({ value: session.id });

  const formData = new FormData();
  formData.set("code", "spa");
  formData.set("name", "Spanish");
  formData.set("text_direction", TextDirectionRaw.LTR);
  formData.set("font", "Noto Sans");
  const response = updateLanguageSettings({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();
});

test("returns not found if the language does not exist", async () => {
  await seedDatabase({
    users: [admin],
    systemRoles: [adminRole],
    sessions: [session],
  });
  cookies.get.mockReturnValue({ value: session.id });

  const formData = new FormData();
  formData.set("code", "spa");
  formData.set("name", "Spanish");
  formData.set("text_direction", TextDirectionRaw.LTR);
  formData.set("font", "Noto Sans");
  const response = updateLanguageSettings({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();
});

test("updates the language settings", async () => {
  const language = {
    id: ulid(),
    code: "spa",
    name: "Spanish",
    textDirection: TextDirectionRaw.LTR,
    font: "Noto Sans",
    translationIds: [],
  };
  const referenceLanguage = {
    id: ulid(),
    code: "eng",
    name: "English",
    textDirection: TextDirectionRaw.LTR,
    font: "Noto Sans",
    translationIds: [],
    referenceLanguageId: null,
  };
  await seedDatabase({
    users: [admin],
    systemRoles: [adminRole],
    sessions: [session],
    languages: [language, referenceLanguage],
  });
  cookies.get.mockReturnValue({ value: session.id });

  const request = {
    name: "Espanol",
    textDirection: TextDirectionRaw.LTR,
    font: "Noto Sans Arabic",
    translationIds: ["asdf1234", "qwer1234"],
    referenceLanguageId: referenceLanguage.id,
  };
  const formData = new FormData();
  formData.set("code", "spa");
  formData.set("name", request.name);
  formData.set("text_direction", request.textDirection);
  formData.set("font", request.font);
  formData.set("bible_translations", request.translationIds.join(","));
  formData.set("reference_language_id", request.referenceLanguageId);
  const response = await updateLanguageSettings({ state: "idle" }, formData);
  expect(response).toEqual({ state: "success" });

  const languages = await findLanguages();
  expect(languages).toEqual([
    referenceLanguage,
    {
      ...language,
      ...request,
    },
  ]);
});
