import { cookies } from "@/tests/mocks/nextjs";
import { sendEmailMock } from "@/tests/mocks/mailer";
import { test, expect } from "vitest";
import {
  findInvitations,
  findLanguageMembers,
  findUsers,
  initializeDatabase,
  seedDatabase,
} from "@/tests/dbUtils";
import { ulid } from "@/shared/ulid";
import { EmailStatusRaw } from "@/modules/users/model/EmailStatus";
import { UserStatusRaw } from "@/modules/users/model/UserStatus";
import { addDays } from "date-fns";
import { LanguageMemberRoleRaw, TextDirectionRaw } from "../model";
import { inviteLanguageMember } from "./inviteLanguageMember";

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

test("returns not found if not a language or platform admin", async () => {
  // Don't set up the admin role on the user
  await seedDatabase({
    users: [admin],
    sessions: [session],
  });

  cookies.get.mockReturnValue({ value: session.id });

  const formData = new FormData();
  formData.set("code", "spa");
  formData.set("email", "invite@example.com");
  formData.set("roles[0]", LanguageMemberRoleRaw.Translator);
  const response = inviteLanguageMember({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();
});

test("returns not found if language does not exist", async () => {
  await seedDatabase({
    users: [admin],
    systemRoles: [adminRole],
    sessions: [session],
  });

  cookies.get.mockReturnValue({ value: session.id });

  const formData = new FormData();
  formData.set("code", "spa");
  formData.set("email", "invite@example.com");
  formData.set("roles[0]", LanguageMemberRoleRaw.Translator);
  const response = inviteLanguageMember({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();
});

test("adds existing user to the language", async () => {
  const language = {
    id: ulid(),
    code: "spa",
    name: "Spanish",
    textDirection: TextDirectionRaw.LTR,
    font: "Noto Sans",
    translationIds: [],
  };
  const user = {
    id: ulid(),
    hashedPassword: "password hash",
    name: "Test Invite",
    email: "invited@example.com",
    emailStatus: EmailStatusRaw.Verified,
    status: UserStatusRaw.Active,
  };
  await seedDatabase({
    users: [admin, user],
    systemRoles: [adminRole],
    sessions: [session],
    languages: [language],
  });
  cookies.get.mockReturnValue({ value: session.id });

  const role = LanguageMemberRoleRaw.Translator;

  const formData = new FormData();
  formData.set("code", language.code);
  formData.set("email", user.email);
  formData.set("roles[0]", role);
  const response = inviteLanguageMember({ state: "idle" }, formData);

  await expect(response).toBeNextjsRedirect(
    `/en/admin/languages/${language.code}/users`,
  );

  const users = await findUsers();
  expect(users).toEqual([admin, user]);

  const languageMembers = await findLanguageMembers();
  expect(languageMembers).toEqual([
    {
      languageId: language.id,
      userId: user.id,
      role: "VIEWER",
    },
    {
      languageId: language.id,
      userId: user.id,
      role,
    },
  ]);

  expect(sendEmailMock).not.toHaveBeenCalled();
});

test("invites new user to the language", async () => {
  const language = {
    id: ulid(),
    code: "spa",
    name: "Spanish",
    textDirection: TextDirectionRaw.LTR,
    font: "Noto Sans",
    translationIds: [],
  };
  await seedDatabase({
    users: [admin],
    systemRoles: [adminRole],
    sessions: [session],
    languages: [language],
  });
  cookies.get.mockReturnValue({ value: session.id });

  const role = LanguageMemberRoleRaw.Translator;
  const email = "invited@example.com";

  const formData = new FormData();
  formData.set("code", language.code);
  formData.set("email", email);
  formData.set("roles[0]", role);
  const response = inviteLanguageMember({ state: "idle" }, formData);

  await expect(response).toBeNextjsRedirect(
    `/en/admin/languages/${language.code}/users`,
  );

  const users = await findUsers();
  expect(users).toEqual([
    admin,
    {
      id: expect.toBeUlid(),
      email,
      emailStatus: EmailStatusRaw.Unverified,
      status: UserStatusRaw.Active,
      hashedPassword: null,
      name: null,
    },
  ]);

  const languageMembers = await findLanguageMembers();
  expect(languageMembers).toEqual([
    {
      languageId: language.id,
      userId: users[1].id,
      role: "VIEWER",
    },
    {
      languageId: language.id,
      userId: users[1].id,
      role,
    },
  ]);

  const invites = await findInvitations();
  expect(invites).toEqual([
    {
      userId: users[1].id,
      token: expect.toBeToken(24),
      expiresAt: expect.toBeDaysIntoFuture(7),
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
