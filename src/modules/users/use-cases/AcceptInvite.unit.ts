import { test, expect } from "vitest";
import AcceptInvite from "./AcceptInvite";
import mockUserRepo from "../data-access/MockUserRepository";
import User from "../model/User";
import UserEmail from "../model/UserEmail";
import EmailStatus from "../model/EmailStatus";
import Password from "../model/Password";
import Invitation from "../model/Invitation";
import { addDays } from "date-fns";
import { InvalidInvitationTokenError } from "../model/errors";
import UserStatus from "../model/UserStatus";

const acceptInvite = new AcceptInvite(mockUserRepo);

test("throws error if invite could not be found", async () => {
  const result = acceptInvite.execute({
    token: "asdf",
    firstName: "First",
    lastName: "Last",
    password: "pa$$word",
  });
  await expect(result).rejects.toThrow(new InvalidInvitationTokenError());
});

test("throws error if invite is expired", async () => {
  const token = "token-asdf";
  const props = {
    id: "user-id",
    email: new UserEmail({
      address: "test@example.com",
      status: EmailStatus.Unverified,
    }),
    passwordResets: [],
    invitations: [
      new Invitation({
        token,
        expiresAt: addDays(new Date(), -1),
      }),
    ],
    status: UserStatus.Active,
    systemRoles: [],
  };
  const user = new User({ ...props });
  mockUserRepo.users = [user];

  const result = acceptInvite.execute({
    token,
    firstName: "First",
    lastName: "Last",
    password: "pa$$word",
  });
  await expect(result).rejects.toThrow(new InvalidInvitationTokenError());
});

test("processes invite and sets up user", async () => {
  const token = "token-asdf";
  const props = {
    id: "user-id",
    email: new UserEmail({
      address: "test@example.com",
      status: EmailStatus.Unverified,
    }),
    passwordResets: [],
    invitations: [
      new Invitation({
        token,
        expiresAt: addDays(new Date(), 1),
      }),
    ],
    status: UserStatus.Active,
    systemRoles: [],
  };
  const user = new User({ ...props });
  mockUserRepo.users = [user];

  const request = {
    token,
    firstName: "First",
    lastName: "Last",
    password: "pa$$word",
  };

  const result = await acceptInvite.execute(request);
  expect(result).toEqual({ userId: user.id });

  expect(mockUserRepo.users).toEqual([
    new User({
      ...props,
      name: `${request.firstName} ${request.lastName}`,
      email: new UserEmail({
        address: props.email.address,
        status: EmailStatus.Verified,
      }),
      password: new Password({
        hash: expect.any(String),
      }),
      invitations: [],
    }),
  ]);
});
