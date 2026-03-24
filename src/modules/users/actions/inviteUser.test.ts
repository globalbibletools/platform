import { sendEmailMock } from "@/tests/vitest/mocks/mailer";
import { test, expect } from "vitest";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { runServerFn } from "@/tests/vitest/serverFnHarness";
import { inviteUser } from "./inviteUser";
import { userFactory } from "../test-utils/userFactory";
import { findInvitationsForUser, findUserByEmail } from "../test-utils/dbUtils";
import { EmailStatusRaw } from "../model/EmailStatus";

initializeDatabase();

test("returns validation errors if the request shape doesn't match the schema", async () => {
  const { session } = await userFactory.build({
    roles: ["admin"],
    session: true,
  });

  const formData = new FormData();
  await expect(
    runServerFn(inviteUser, {
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
          "email"
        ],
        "message": "Required"
      }
    ]]
  `);
});

test("returns not found if user is not a platform admin", async () => {
  const { session } = await userFactory.build({ session: true });

  const formData = new FormData();
  formData.set("email", "invite@example.com");
  const response = runServerFn(inviteUser, {
    data: formData,
    sessionId: session!.id,
  });
  await expect(response).rejects.toThrowErrorMatchingInlineSnapshot(
    `[Error: UnauthorizedError]`,
  );
});

test("returns error if user is already active", async () => {
  const { session } = await userFactory.build({
    roles: ["admin"],
    session: true,
  });

  const { user } = await userFactory.build();

  const formData = new FormData();
  formData.set("email", user.email);
  await expect(
    runServerFn(inviteUser, {
      data: formData,
      sessionId: session!.id,
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: errors.user_exists]`);
});

test("invites user", async () => {
  const { session } = await userFactory.build({
    roles: ["admin"],
    session: true,
  });

  const email = "invite@example.com";
  const formData = new FormData();
  formData.set("email", email);
  const { response } = await runServerFn(inviteUser, {
    data: formData,
    sessionId: session!.id,
  });
  expect(response.status).toEqual(204);

  const createdUser = await findUserByEmail(email);
  expect(createdUser).toEqual({
    id: expect.toBeUlid(),
    email,
    email_status: EmailStatusRaw.Unverified,
    status: "active",
    name: null,
    hashed_password: null,
  });

  const invites = await findInvitationsForUser(createdUser!.id);
  expect(invites).toEqual([
    {
      user_id: createdUser!.id,
      token: expect.toBeToken(24),
      expires_at: expect.toBeDaysIntoFuture(7),
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
