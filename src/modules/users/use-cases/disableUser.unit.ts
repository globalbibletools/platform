import fakeLanguageClient from "@/modules/languages/public/FakeLanguageClient";
import mockUserRepo from "../data-access/mockUserRepository";
import { disableUser } from "./disableUser";
import { ulid } from "@/shared/ulid";
import { expect, test, vi } from "vitest";
import { NotFoundError } from "@/shared/errors";
import UserEmail from "../model/UserEmail";
import EmailStatus from "../model/EmailStatus";
import Invitation from "../model/Invitation";
import { addDays } from "date-fns";
import UserStatus from "../model/UserStatus";
import User from "../model/User";

vi.mock(
  "../data-access/userRepository",
  () => import("../data-access/mockUserRepository"),
);
vi.mock("@/modules/languages/public/LanguageClient", async () => ({
  languageClient: (
    await import("@/modules/languages/public/FakeLanguageClient")
  ).default,
}));

test("throws error if user does not exist", async () => {
  const result = disableUser({ userId: ulid() });
  await expect(result).rejects.toThrow(new NotFoundError("User"));
});

test("disables users and removes from langauges", async () => {
  const props = {
    id: "user-id",
    email: new UserEmail({
      address: "test@example.com",
      status: EmailStatus.Unverified,
    }),
    passwordResets: [],
    invitations: [
      new Invitation({
        token: "invite-token-asdf",
        expiresAt: addDays(new Date(), 1),
      }),
    ],
    status: UserStatus.Active,
    systemRoles: [],
  };
  const user = new User({ ...props });
  mockUserRepo.users = [user];

  const languageMembers = [
    {
      userId: props.id,
      roles: [],
    },
    {
      userId: ulid(),
      roles: [],
    },
  ];
  const language = {
    id: ulid(),
    name: "Spanish",
    code: "spa",
    members: languageMembers.slice(),
  };
  fakeLanguageClient.languages = [language];

  await disableUser({ userId: props.id });

  expect(mockUserRepo.users).toEqual([
    new User({
      ...props,
      invitations: [],
      status: UserStatus.Disabled,
    }),
  ]);

  expect(fakeLanguageClient.languages).toEqual([
    {
      ...language,
      members: [languageMembers[1]],
    },
  ]);
});
