import "@/tests/mocks/nextjs";
import {
  findInvitations,
  findSessions,
  findUsers,
  initializeDatabase,
  seedDatabase,
} from "@/tests/dbUtils";
import { test, expect } from "vitest";
import { acceptInvite } from "./acceptInvite";
import { ulid } from "@/shared/ulid";
import { EmailStatusRaw } from "../model/EmailStatus";
import { UserStatusRaw } from "../model/UserStatus";
import { addDays } from "date-fns";
import { cookies } from "@/tests/mocks/nextjs";

initializeDatabase();

test("returns validation error if the request shape doesn't match the schema", async () => {
  {
    const formData = new FormData();
    const response = await acceptInvite({ state: "idle" }, formData);
    expect(response).toEqual({
      state: "error",
      validation: {
        confirm_password: ["Please enter your password again."],
        first_name: ["Please enter your first name."],
        last_name: ["Please enter your last name."],
        password: ["Please enter your password."],
        token: ["Invalid"],
      },
    });
  }
  {
    const formData = new FormData();
    formData.set("token", "asdf");
    formData.set("first_name", "");
    formData.set("last_name", "");
    formData.set("password", "");
    formData.set("confirm_password", "");
    const response = await acceptInvite({ state: "idle" }, formData);
    expect(response).toEqual({
      state: "error",
      validation: {
        confirm_password: ["Please enter your password again."],
        first_name: ["Please enter your first name."],
        last_name: ["Please enter your last name."],
        password: ["Please enter a password with at least 8 characters."],
      },
    });
  }
  {
    const formData = new FormData();
    formData.set("token", "asdf");
    formData.set("first_name", "First");
    formData.set("last_name", "Last");
    formData.set("password", "asdfasdf");
    formData.set("confirm_password", "asdf");
    const response = await acceptInvite({ state: "idle" }, formData);
    expect(response).toEqual({
      state: "error",
      validation: {
        confirm_password: ["Your password does not match."],
      },
    });
  }
});

test("returns not found error if token is invalid", async () => {
  const user = {
    id: ulid(),
    email: "test@example.com",
    emailStatus: EmailStatusRaw.Unverified,
    status: UserStatusRaw.Active,
  };
  const invitation = {
    userId: user.id,
    token: "token-asdf",
    expiresAt: addDays(new Date(), -1),
  };
  await seedDatabase({ users: [user], invitations: [invitation] });

  const formData = new FormData();
  formData.set("token", invitation.token);
  formData.set("first_name", "First");
  formData.set("last_name", "Last");
  formData.set("password", "pa$$word");
  formData.set("confirm_password", "pa$$word");
  const response = acceptInvite({ state: "idle" }, formData);

  await expect(response).toBeNextjsNotFound();
});

test("sets up user and logs them in", async () => {
  const user = {
    id: ulid(),
    email: "test@example.com",
    emailStatus: EmailStatusRaw.Unverified,
    status: UserStatusRaw.Active,
  };
  const invitation = {
    userId: user.id,
    token: "token-asdf",
    expiresAt: addDays(new Date(), 2),
  };
  await seedDatabase({ users: [user], invitations: [invitation] });

  const formData = new FormData();
  formData.set("token", invitation.token);
  formData.set("first_name", "First");
  formData.set("last_name", "Last");
  formData.set("password", "pa$$word");
  formData.set("confirm_password", "pa$$word");
  const response = acceptInvite({ state: "idle" }, formData);

  await expect(response).toBeNextjsRedirect("/en/read/eng/01001");

  const users = await findUsers();
  expect(users).toEqual([
    {
      ...user,
      emailStatus: EmailStatusRaw.Verified,
      name: "First Last",
      hashedPassword: expect.any(String),
    },
  ]);

  const invitations = await findInvitations();
  expect(invitations).toEqual([]);

  const dbSessions = await findSessions();
  expect(dbSessions).toEqual([
    {
      id: expect.any(String),
      userId: user.id,
      expiresAt: expect.any(Date),
    },
  ]);

  expect(cookies.set).toHaveBeenCalledExactlyOnceWith(
    "session",
    dbSessions[0].id,
    expect.any(Object),
  );
});
