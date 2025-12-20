import "@/tests/vitest/mocks/nextjs";
import { sendEmailMock } from "@/tests/vitest/mocks/mailer";
import { test, expect } from "vitest";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { EmailStatusRaw } from "@/modules/users/model/EmailStatus";
import { UserStatusRaw } from "@/modules/users/model/UserStatus";
import { LanguageMemberRoleRaw } from "../model";
import { inviteLanguageMember } from "./inviteLanguageMember";
import { createScenario, ScenarioDefinition } from "@/tests/scenarios";
import { SystemRoleRaw } from "@/modules/users/model/SystemRole";
import logIn from "@/tests/vitest/login";
import {
  findInvitationsForUser,
  findUserByEmail,
  findUserById,
} from "@/modules/users/test-utils/dbUtils";
import { userFactory } from "@/modules/users/test-utils/factories";
import { findLanguageRolesForLanguage } from "../test-utils/dbUtils";
import { getDb } from "@/db";

initializeDatabase();

const scenarioDefinition: ScenarioDefinition = {
  users: {
    admin: {
      systemRoles: [SystemRoleRaw.Admin],
    },
    member: {},
  },
  languages: {
    spanish: {},
  },
};

test("returns validation error if the request shape doesn't match the schema", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.admin.id);

  {
    const formData = new FormData();
    const response = await inviteLanguageMember({ state: "idle" }, formData);
    expect(response).toEqual({
      state: "error",
      validation: {
        code: ["Invalid"],
        roles: ["Invalid"],
        email: ["Please enter a valid email."],
      },
    });
  }
  {
    const formData = new FormData();
    formData.set("email", "garbage");
    const response = await inviteLanguageMember({ state: "idle" }, formData);
    expect(response).toEqual({
      state: "error",
      validation: {
        code: ["Invalid"],
        roles: ["Invalid"],
        email: ["Please enter a valid email."],
      },
    });
  }
});

test("returns not found if not a platform admin", async () => {
  const scenario = await createScenario({
    users: { user: {} },
    languages: { spanish: {} },
  });
  await logIn(scenario.users.user.id);

  const language = scenario.languages.spanish;

  const formData = new FormData();
  formData.set("code", language.code);
  formData.set("email", "invite@example.com");
  formData.set("roles[0]", LanguageMemberRoleRaw.Translator);
  const response = inviteLanguageMember({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();

  const languageRoles = await findLanguageRolesForLanguage(language.id);
  expect(languageRoles).toEqual([]);
});

test("returns not found if language does not exist", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.admin.id);

  const formData = new FormData();
  formData.set("code", "garbage");
  formData.set("email", "invite@example.com");
  formData.set("roles[0]", LanguageMemberRoleRaw.Translator);
  const response = inviteLanguageMember({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();
});

test("adds existing user to the language", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.admin.id);

  const language = scenario.languages.spanish;
  const user = await userFactory.build();

  const role = LanguageMemberRoleRaw.Translator;

  const formData = new FormData();
  formData.set("code", language.code);
  formData.set("email", user.email);
  formData.set("roles[0]", role);
  const response = inviteLanguageMember({ state: "idle" }, formData);

  await expect(response).toBeNextjsRedirect(
    `/en/admin/languages/${language.code}/users`,
  );

  const updatedUser = await findUserById(user.id);
  expect(updatedUser).toEqual(user);

  const invites = await findInvitationsForUser(updatedUser!.id);
  expect(invites).toEqual([]);

  const languageRoles = await findLanguageRolesForLanguage(language.id);
  expect(languageRoles).toEqual([
    {
      languageId: language.id,
      userId: updatedUser!.id,
      role: "VIEWER",
    },
    {
      languageId: language.id,
      userId: updatedUser!.id,
      role,
    },
  ]);

  const languageMembers = await getDb()
    .selectFrom("language_member")
    .selectAll()
    .execute();
  expect(languageMembers).toEqual([
    {
      language_id: language.id,
      user_id: user.id,
      invited_at: expect.toBeNow(),
    },
  ]);

  expect(sendEmailMock).not.toHaveBeenCalled();
});

test("invites new user to the language", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.admin.id);

  const language = scenario.languages.spanish;

  const email = "testinvite@example.com";
  const role = LanguageMemberRoleRaw.Translator;

  const formData = new FormData();
  formData.set("code", language.code);
  formData.set("email", email);
  formData.set("roles[0]", role);
  const response = inviteLanguageMember({ state: "idle" }, formData);

  await expect(response).toBeNextjsRedirect(
    `/en/admin/languages/${language.code}/users`,
  );

  const createdUser = await findUserByEmail(email);
  expect(createdUser).toEqual({
    id: expect.toBeUlid(),
    name: null,
    hashedPassword: null,
    email,
    emailStatus: EmailStatusRaw.Unverified,
    status: UserStatusRaw.Active,
  });

  const invites = await findInvitationsForUser(createdUser!.id);
  expect(invites).toEqual([
    {
      userId: createdUser!.id,
      token: expect.toBeToken(24),
      expiresAt: expect.toBeDaysIntoFuture(7),
    },
  ]);

  const languageRoles = await findLanguageRolesForLanguage(language.id);
  expect(languageRoles).toEqual([
    {
      languageId: language.id,
      userId: createdUser!.id,
      role: "VIEWER",
    },
    {
      languageId: language.id,
      userId: createdUser!.id,
      role,
    },
  ]);

  const languageMembers = await getDb()
    .selectFrom("language_member")
    .selectAll()
    .execute();
  expect(languageMembers).toEqual([
    {
      language_id: language.id,
      user_id: createdUser!.id,
      invited_at: expect.toBeNow(),
    },
  ]);

  const url = `${process.env.ORIGIN}/invite?token=${invites[0].token}`;
  expect(sendEmailMock).toHaveBeenCalledExactlyOnceWith({
    email,
    subject: "GlobalBibleTools Invite",
    text: `You've been invited to globalbibletools.com. Click the following to accept your invite and get started.\n\n${url.toString()}`,
    html: `You've been invited to globalbibletools.com. <a href="${url.toString()}">Click here<a/> to accept your invite and get started.`,
  });
});
