import "@/tests/vitest/mocks/nextjs";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { test, expect } from "vitest";
import { acceptInvite } from "./acceptInvite";
import { EmailStatusRaw } from "../model/EmailStatus";
import { cookies } from "@/tests/vitest/mocks/nextjs";
import { invitationFactory, userFactory } from "../test-utils/factories";
import { faker } from "@faker-js/faker/locale/en";
import {
  findInvitationsForUser,
  findSessionsForUser,
  findUserById,
} from "../test-utils/dbUtils";

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
  const user = await userFactory.build({
    emailStatus: EmailStatusRaw.Unverified,
    hashedPassword: null,
  });
  const invitation = await invitationFactory.build({
    userId: user.id,
    expiresAt: faker.date.past(),
  });

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
  const user = await userFactory.build({
    emailStatus: EmailStatusRaw.Unverified,
    hashedPassword: null,
  });
  const invitation = await invitationFactory.build({
    userId: user.id,
  });

  const formData = new FormData();
  formData.set("token", invitation.token);
  formData.set("first_name", "First");
  formData.set("last_name", "Last");
  formData.set("password", "pa$$word");
  formData.set("confirm_password", "pa$$word");
  const response = acceptInvite({ state: "idle" }, formData);

  await expect(response).toBeNextjsRedirect("/en/read/eng/01001");

  const updatedUser = await findUserById(user.id);
  expect(updatedUser).toEqual({
    ...user,
    emailStatus: EmailStatusRaw.Verified,
    name: "First Last",
    hashedPassword: expect.any(String),
  });

  const invitations = await findInvitationsForUser(user.id);
  expect(invitations).toEqual([]);

  const dbSessions = await findSessionsForUser(user.id);
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
