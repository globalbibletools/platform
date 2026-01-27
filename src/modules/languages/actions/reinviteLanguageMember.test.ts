import "@/tests/vitest/mocks/nextjs";
import { sendEmailMock } from "@/tests/vitest/mocks/mailer";
import { test, expect } from "vitest";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { EmailStatusRaw } from "@/modules/users/model/EmailStatus";
import { UserStatusRaw } from "@/modules/users/model/UserStatus";
import { reinviteLanguageMemberAction } from "./reinviteLanguageMember";
import { createScenario, ScenarioDefinition } from "@/tests/scenarios";
import { SystemRoleRaw } from "@/modules/users/model/SystemRole";
import logIn from "@/tests/vitest/login";
import {
  findInvitationsForUser,
  findUserById,
} from "@/modules/users/test-utils/dbUtils";
import {
  invitationFactory,
  userFactory,
} from "@/modules/users/test-utils/factories";
import { findLanguageMembersForLanguage } from "../test-utils/dbUtils";
import { languageMemberFactory } from "../test-utils/factories";
import { ulid } from "@/shared/ulid";

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
    const response = await reinviteLanguageMemberAction(
      { state: "idle" },
      formData,
    );
    expect(response).toEqual({
      state: "error",
    });
  }
  {
    const formData = new FormData();
    formData.set("code", "spa");
    const response = await reinviteLanguageMemberAction(
      { state: "idle" },
      formData,
    );
    expect(response).toEqual({
      state: "error",
    });
  }
  {
    const formData = new FormData();
    formData.set("userId", "user123");
    const response = await reinviteLanguageMemberAction(
      { state: "idle" },
      formData,
    );
    expect(response).toEqual({
      state: "error",
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
  const user = await userFactory.build();

  await languageMemberFactory.build({
    userId: user.id,
    languageId: language.id,
  });

  const formData = new FormData();
  formData.set("code", language.code);
  formData.set("userId", user.id);
  const response = reinviteLanguageMemberAction({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();

  expect(sendEmailMock).not.toHaveBeenCalled();
});

test("returns not found if language does not exist", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.admin.id);

  const user = await userFactory.build();

  const formData = new FormData();
  formData.set("code", "garbage");
  formData.set("userId", user.id);
  const response = reinviteLanguageMemberAction({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();

  expect(sendEmailMock).not.toHaveBeenCalled();
});

test("throws error if user is not a member of the language", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.admin.id);

  const language = scenario.languages.spanish;
  const user = await userFactory.build();

  const formData = new FormData();
  formData.set("code", language.code);
  formData.set("userId", user.id);
  const response = reinviteLanguageMemberAction({ state: "idle" }, formData);

  await expect(response).rejects.toThrow(
    new Error("User is not a member of this language"),
  );

  expect(sendEmailMock).not.toHaveBeenCalled();
});

test("throws error if user does not exist", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.admin.id);

  const language = scenario.languages.spanish;

  const formData = new FormData();
  formData.set("code", language.code);
  formData.set("userId", ulid());
  const response = reinviteLanguageMemberAction({ state: "idle" }, formData);

  await expect(response).rejects.toThrow(
    new Error("User is not a member of this language"),
  );

  expect(sendEmailMock).not.toHaveBeenCalled();
});

test("successfully reinvites a language member and sends email", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.admin.id);

  const language = scenario.languages.spanish;
  const user = await userFactory.build({
    hashedPassword: null,
  });
  const invite = await invitationFactory.build({
    userId: user.id,
  });

  await languageMemberFactory.build({
    userId: user.id,
    languageId: language.id,
  });

  const formData = new FormData();
  formData.set("code", language.code);
  formData.set("userId", user.id);
  const response = await reinviteLanguageMemberAction(
    { state: "idle" },
    formData,
  );

  expect(response).toEqual({ state: "success" });

  const updatedUser = await findUserById(user.id);
  expect(updatedUser).toEqual({
    id: user.id,
    name: user.name,
    hashedPassword: user.hashedPassword,
    email: user.email,
    emailStatus: user.emailStatus,
    status: user.status,
  });

  const invites = await findInvitationsForUser(user.id);
  expect(invites).toEqual([
    invite,
    {
      userId: user.id,
      token: expect.toBeToken(24),
      expiresAt: expect.toBeDaysIntoFuture(7),
    },
  ]);

  const updatedLanguageMembers = await findLanguageMembersForLanguage(
    language.id,
  );
  expect(updatedLanguageMembers).toEqual([
    {
      language_id: language.id,
      user_id: user.id,
      invited_at: expect.any(Date),
    },
  ]);

  const url = `${process.env.ORIGIN}/invite?token=${invites[1].token}`;
  expect(sendEmailMock).toHaveBeenCalledExactlyOnceWith({
    email: user.email,
    subject: "GlobalBibleTools Invite",
    text: `You've been invited to globalbibletools.com. Click the following to accept your invite and get started.\n\n${url.toString()}`,
    html: `You've been invited to globalbibletools.com. <a href="${url.toString()}">Click here<a/> to accept your invite and get started.`,
  });
});
