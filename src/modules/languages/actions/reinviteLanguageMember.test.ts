import { sendEmailMock } from "@/tests/vitest/mocks/mailer";
import { test, expect } from "vitest";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { runServerFn } from "@/tests/vitest/serverFnHarness";
import { reinviteLanguageMemberAction } from "./reinviteLanguageMember";
import {
  findInvitationsForUser,
  findUserById,
} from "@/modules/users/test-utils/dbUtils";
import { userFactory } from "@/modules/users/test-utils/userFactory";
import { findLanguageMembersForLanguage } from "../test-utils/dbUtils";
import { languageFactory } from "../test-utils/languageFactory";
import { ulid } from "@/shared/ulid";

initializeDatabase();

test("returns validation error if the request shape doesn't match the schema", async () => {
  const { session } = await userFactory.build({
    roles: ["admin"],
    session: true,
  });

  await expect(
    runServerFn(reinviteLanguageMemberAction, {
      data: {},
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
          "userId"
        ],
        "message": "Required"
      }
    ]]
  `);
});

test("returns not found if not a platform admin", async () => {
  const { session } = await userFactory.build({ session: true });
  const { user: member } = await userFactory.build();
  const { language } = await languageFactory.build({ members: [member.id] });

  const data = {
    code: language.code,
    userId: member.id,
  };

  const response = runServerFn(reinviteLanguageMemberAction, {
    data,
    sessionId: session!.id,
  });
  await expect(response).rejects.toThrowErrorMatchingInlineSnapshot(
    `[Error: UnauthorizedError]`,
  );

  expect(sendEmailMock).not.toHaveBeenCalled();
});

test("returns not found if language does not exist", async () => {
  const { session } = await userFactory.build({
    roles: ["admin"],
    session: true,
  });
  const { user } = await userFactory.build();

  const data = {
    code: "garbage",
    userId: user.id,
  };

  const response = runServerFn(reinviteLanguageMemberAction, {
    data,
    sessionId: session!.id,
  });
  await expect(response).toBeTanstackNotFound();

  expect(sendEmailMock).not.toHaveBeenCalled();
});

test("throws error if user is not a member of the language", async () => {
  const { session } = await userFactory.build({
    roles: ["admin"],
    session: true,
  });
  const { language } = await languageFactory.build();
  const { user } = await userFactory.build();

  const data = {
    code: language.code,
    userId: user.id,
  };

  await expect(
    runServerFn(reinviteLanguageMemberAction, {
      data,
      sessionId: session!.id,
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `[Error: User is not a member of this language]`,
  );

  expect(sendEmailMock).not.toHaveBeenCalled();
});

test("throws error if user does not exist", async () => {
  const { session } = await userFactory.build({
    roles: ["admin"],
    session: true,
  });
  const { language } = await languageFactory.build();

  const data = {
    code: language.code,
    userId: ulid(),
  };

  await expect(
    runServerFn(reinviteLanguageMemberAction, {
      data,
      sessionId: session!.id,
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `[Error: User is not a member of this language]`,
  );

  expect(sendEmailMock).not.toHaveBeenCalled();
});

test("successfully reinvites a language member and sends email", async () => {
  const { session } = await userFactory.build({
    roles: ["admin"],
    session: true,
  });
  const { user, invitation } = await userFactory.build({ state: "invited" });
  const { language } = await languageFactory.build({ members: [user.id] });

  const data = {
    code: language.code,
    userId: user.id,
  };

  const { response } = await runServerFn(reinviteLanguageMemberAction, {
    data,
    sessionId: session!.id,
  });

  expect(response.status).toEqual(204);

  const updatedUser = await findUserById(user.id);
  expect(updatedUser).toEqual(user);

  const invites = await findInvitationsForUser(user.id);
  expect(invites).toEqual([
    invitation!,
    {
      user_id: user.id,
      token: expect.toBeToken(24),
      expires_at: expect.toBeDaysIntoFuture(7),
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
