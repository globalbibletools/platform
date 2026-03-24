import { sendEmailMock } from "@/tests/vitest/mocks/mailer";
import { test, expect } from "vitest";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { runServerFn } from "@/tests/vitest/serverFnHarness";
import { EmailStatusRaw } from "@/modules/users/model/EmailStatus";
import { UserStatusRaw } from "@/modules/users/model/UserStatus";
import { inviteLanguageMember } from "./inviteLanguageMember";
import {
  findInvitationsForUser,
  findUserByEmail,
  findUserById,
} from "@/modules/users/test-utils/dbUtils";
import { userFactory } from "@/modules/users/test-utils/userFactory";
import { findLanguageMembersForLanguage } from "../test-utils/dbUtils";
import { languageFactory } from "../test-utils/languageFactory";

initializeDatabase();

test("returns validation error if the request shape doesn't match the schema", async () => {
  const { session } = await userFactory.build({
    roles: ["admin"],
    session: true,
  });

  const formData = new FormData();
  await expect(
    runServerFn(inviteLanguageMember, {
      data: formData,
      sessionId: session!.id,
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`
      [ZodError: [
        {
          "code": "invalid_type",
          "expected": "string",
          "received": "undefined",
          "path": [
            "code"
          ],
          "message": "Required"
        },
        {
          "code": "invalid_type",
          "expected": "string",
          "received": "undefined",
          "path": [
            "email"
          ],
          "message": "Required"
        }
      ]]
    `);
});

test("returns not found if not a platform admin", async () => {
  const { session } = await userFactory.build({ session: true });
  const { language } = await languageFactory.build({ members: [] });

  const formData = new FormData();
  formData.set("code", language.code);
  formData.set("email", "invite@example.com");

  const response = runServerFn(inviteLanguageMember, {
    data: formData,
    sessionId: session!.id,
  });
  await expect(response).rejects.toThrowErrorMatchingInlineSnapshot(
    `[Error: UnauthorizedError]`,
  );

  const languageMembers = await findLanguageMembersForLanguage(language.id);
  expect(languageMembers).toEqual([]);
});

test("returns not found if language does not exist", async () => {
  const { session } = await userFactory.build({
    roles: ["admin"],
    session: true,
  });

  const formData = new FormData();
  formData.set("code", "garbage");
  formData.set("email", "invite@example.com");

  const response = runServerFn(inviteLanguageMember, {
    data: formData,
    sessionId: session!.id,
  });
  await expect(response).toBeTanstackNotFound();
});

test("adds existing user to the language", async () => {
  const { session } = await userFactory.build({
    roles: ["admin"],
    session: true,
  });
  const { language } = await languageFactory.build({ members: [] });

  const { user } = await userFactory.build();

  const formData = new FormData();
  formData.set("code", language.code);
  formData.set("email", user.email);

  const { response } = await runServerFn(inviteLanguageMember, {
    data: formData,
    sessionId: session!.id,
  });

  expect(response.status).toEqual(204);

  const updatedUser = await findUserById(user.id);
  expect(updatedUser).toEqual(user);

  const invites = await findInvitationsForUser(updatedUser!.id);
  expect(invites).toEqual([]);

  const languageMembers = await findLanguageMembersForLanguage(language.id);
  expect(languageMembers).toEqual([
    {
      language_id: language.id,
      user_id: updatedUser!.id,
      invited_at: expect.any(Date),
    },
  ]);

  expect(sendEmailMock).not.toHaveBeenCalled();
});

test("invites new user to the language", async () => {
  const { session } = await userFactory.build({
    roles: ["admin"],
    session: true,
  });
  const { language } = await languageFactory.build({ members: [] });

  const email = "testinvite@example.com";

  const formData = new FormData();
  formData.set("code", language.code);
  formData.set("email", email);

  const { response } = await runServerFn(inviteLanguageMember, {
    data: formData,
    sessionId: session!.id,
  });

  expect(response.status).toEqual(204);

  const createdUser = await findUserByEmail(email);
  expect(createdUser).toEqual({
    id: expect.toBeUlid(),
    name: null,
    hashed_password: null,
    email,
    email_status: EmailStatusRaw.Unverified,
    status: UserStatusRaw.Active,
  });

  const invites = await findInvitationsForUser(createdUser!.id);
  expect(invites).toEqual([
    {
      user_id: createdUser!.id,
      token: expect.toBeToken(24),
      expires_at: expect.toBeDaysIntoFuture(7),
    },
  ]);

  const languageMembers = await findLanguageMembersForLanguage(language.id);
  expect(languageMembers).toEqual([
    {
      language_id: language.id,
      user_id: createdUser!.id,
      invited_at: expect.any(Date),
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
