import "@/tests/vitest/mocks/nextjs";
import { sendEmailMock } from "@/tests/vitest/mocks/mailer";
import { test, expect } from "vitest";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { reinviteLanguageMemberAction } from "./reinviteLanguageMember";
import logIn from "@/tests/vitest/login";
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
  const { user: admin } = await userFactory.build({ roles: ["admin"] });
  await logIn(admin.id);

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
  const { user } = await userFactory.build();
  const { user: member } = await userFactory.build();
  const { language } = await languageFactory.build({ members: [member.id] });
  await logIn(user.id);

  const formData = new FormData();
  formData.set("code", language.code);
  formData.set("userId", member.id);
  const response = reinviteLanguageMemberAction({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();

  expect(sendEmailMock).not.toHaveBeenCalled();
});

test("returns not found if language does not exist", async () => {
  const { user: admin } = await userFactory.build({ roles: ["admin"] });
  const { user } = await userFactory.build();
  await logIn(admin.id);

  const formData = new FormData();
  formData.set("code", "garbage");
  formData.set("userId", user.id);
  const response = reinviteLanguageMemberAction({ state: "idle" }, formData);
  await expect(response).toBeNextjsNotFound();

  expect(sendEmailMock).not.toHaveBeenCalled();
});

test("throws error if user is not a member of the language", async () => {
  const { user: admin } = await userFactory.build({ roles: ["admin"] });
  const { language } = await languageFactory.build();
  const { user } = await userFactory.build();
  await logIn(admin.id);

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
  const { user: admin } = await userFactory.build({ roles: ["admin"] });
  const { language } = await languageFactory.build();
  await logIn(admin.id);

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
  const { user: admin } = await userFactory.build({ roles: ["admin"] });
  const { user, invitation } = await userFactory.build({ state: "invited" });
  const { language } = await languageFactory.build({ members: [user.id] });
  await logIn(admin.id);

  const formData = new FormData();
  formData.set("code", language.code);
  formData.set("userId", user.id);
  const response = await reinviteLanguageMemberAction(
    { state: "idle" },
    formData,
  );

  expect(response).toEqual({
    state: "success",
    message: "User invitation resent",
  });

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
