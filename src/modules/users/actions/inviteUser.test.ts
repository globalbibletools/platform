import "@/tests/vitest/mocks/nextjs";
import { sendEmailMock } from "@/tests/vitest/mocks/mailer";
import { test, expect } from "vitest";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { inviteUser } from "./inviteUser";
import logIn from "@/tests/vitest/login";
import { userFactory } from "../test-utils/userFactory";
import { findInvitationsForUser, findUserByEmail } from "../test-utils/dbUtils";
import { EmailStatusRaw } from "../model/EmailStatus";

initializeDatabase();

test("returns validation errors if the request shape doesn't match the schema", async () => {
  const { user: admin } = await userFactory.build({ roles: ["admin"] });
  await logIn(admin.id);

  {
    const formData = new FormData();
    const response = await inviteUser({ state: "idle" }, formData);
    expect(response).toEqual({
      state: "error",
      validation: {
        email: ["Please enter your email."],
      },
    });
  }
  {
    const formData = new FormData();
    formData.set("email", "");
    const response = await inviteUser({ state: "idle" }, formData);
    expect(response).toEqual({
      state: "error",
      validation: {
        email: ["Please enter a valid email.", "Please enter your email."],
      },
    });
  }
  {
    const formData = new FormData();
    formData.set("email", "garbage");
    const response = await inviteUser({ state: "idle" }, formData);
    expect(response).toEqual({
      state: "error",
      validation: {
        email: ["Please enter a valid email."],
      },
    });
  }
});

test("returns not found if user is not a platform admin", async () => {
  const { user } = await userFactory.build();
  await logIn(user.id);

  const formData = new FormData();
  formData.set("email", "invite@example.com");
  const response = inviteUser({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();
});

test("returns error if user is already active", async () => {
  const { user: admin } = await userFactory.build({ roles: ["admin"] });
  await logIn(admin.id);

  const { user } = await userFactory.build();

  const formData = new FormData();
  formData.set("email", user.email);
  const response = await inviteUser({ state: "idle" }, formData);
  expect(response).toEqual({
    state: "error",
    error: "This user already exists.",
  });
});

test("invites user and redirects back to users list", async () => {
  const { user: admin } = await userFactory.build({ roles: ["admin"] });
  await logIn(admin.id);

  const email = "invite@example.com";
  const formData = new FormData();
  formData.set("email", email);
  const response = inviteUser({ state: "idle" }, formData);
  await expect(response).toBeNextjsRedirect("/en/admin/users");

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
