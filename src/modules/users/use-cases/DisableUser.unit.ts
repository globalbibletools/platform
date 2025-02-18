import fakeLanguageClient from "@/modules/languages/public/FakeLanguageClient";
import mockUserRepo from "../data-access/MockUserRepository";
import DisableUser from "./DisableUser";
import { ulid } from "@/shared/ulid";
import { expect, test } from "vitest";
import { NotFoundError } from "@/shared/errors";
import UserEmail from "../model/UserEmail";
import EmailStatus from "../model/EmailStatus";
import Invitation from "../model/Invitation";
import { addDays } from "date-fns";
import UserStatus from "../model/UserStatus";
import User from "../model/User";

const disableUser = new DisableUser(mockUserRepo, fakeLanguageClient);

test("throws error if user does not exist", async () => {
  const result = disableUser.execute({ userId: ulid() });
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
    members: languageMembers.slice(),
  };
  fakeLanguageClient.languages = [language];

  await disableUser.execute({ userId: props.id });

  expect(mockUserRepo.users).toEqual([
    new User({
      ...props,
      invitations: [],
      status: UserStatus.Disabled,
    }),
  ]);

  expect(fakeLanguageClient.languages).toEqual([
    {
      id: language.id,
      members: [languageMembers[1]],
    },
  ]);
});
