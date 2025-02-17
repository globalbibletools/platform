import { cookies } from "@/tests/mocks/nextjs";
import { sendEmailMock } from "@/tests/mocks/mailer";
import { test, expect } from "vitest";
import { Scrypt } from "oslo/password";
import { EmailStatusRaw } from "../model/EmailStatus";
import { UserStatusRaw } from "../model/UserStatus";
import {
  findInvitations,
  findUsers,
  initializeDatabase,
  seedDatabase,
} from "@/tests/dbUtils";
import { addDays } from "date-fns";
import { inviteUser } from "./inviteUser";
import { ulid } from "@/shared/ulid";

initializeDatabase();

const admin = {
  id: ulid(),
  hashedPassword: await new Scrypt().hash("pa$$word"),
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

test("returns validation errors if the request shape doesn't match the schema", async () => {
  await seedDatabase({
    users: [admin],
    systemRoles: [adminRole],
    sessions: [session],
  });

  cookies.get.mockReturnValue({ value: session.id });

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
  // Don't set up the admin role on the user
  await seedDatabase({
    users: [admin],
    sessions: [session],
  });

  cookies.get.mockReturnValue({ value: session.id });

  const formData = new FormData();
  formData.set("email", "invite@example.com");
  const response = inviteUser({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();
});

test("returns error if user is already active", async () => {
  const existingUser = {
    id: ulid(),
    email: "invite@example.com",
    hashedPassword: "password hash",
    emailStatus: EmailStatusRaw.Verified,
    status: UserStatusRaw.Active,
  };
  await seedDatabase({
    users: [admin, existingUser],
    systemRoles: [adminRole],
    sessions: [session],
  });

  cookies.get.mockReturnValue({ value: session.id });

  const formData = new FormData();
  formData.set("email", existingUser.email);
  const response = await inviteUser({ state: "idle" }, formData);
  expect(response).toEqual({
    state: "error",
    error: "This user already exists.",
  });
});

test("invites user and redirects back to users list", async () => {
  await seedDatabase({
    users: [admin],
    systemRoles: [adminRole],
    sessions: [session],
  });

  cookies.get.mockReturnValue({ value: session.id });

  const email = "invite@example.com";
  const formData = new FormData();
  formData.set("email", email);
  const response = inviteUser({ state: "idle" }, formData);
  await expect(response).toBeNextjsRedirect("/en/admin/users");

  const users = await findUsers();
  expect(users).toEqual([
    admin,
    {
      id: expect.toBeUlid(),
      email,
      emailStatus: EmailStatusRaw.Unverified,
      status: UserStatusRaw.Active,
      name: null,
      hashedPassword: null,
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
