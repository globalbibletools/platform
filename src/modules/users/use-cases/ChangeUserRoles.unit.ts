import mockUserRepo from "../data-access/MockUserRepository";
import { ulid } from "@/shared/ulid";
import { expect, test } from "vitest";
import { NotFoundError } from "@/shared/errors";
import UserEmail from "../model/UserEmail";
import EmailStatus from "../model/EmailStatus";
import Invitation from "../model/Invitation";
import { addDays } from "date-fns";
import UserStatus from "../model/UserStatus";
import User from "../model/User";
import SystemRole, { SystemRoleRaw } from "../model/SystemRole";
import ChangeUserRoles from "./ChangeUserRoles";

const changeUserRoles = new ChangeUserRoles(mockUserRepo);

test("throws error if user does not exist", async () => {
  const result = changeUserRoles.execute({ userId: ulid(), roles: [] });
  await expect(result).rejects.toThrow(new NotFoundError("User"));
});

test("replaces user system roles", async () => {
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

  await changeUserRoles.execute({
    userId: props.id,
    roles: [SystemRoleRaw.Admin],
  });

  expect(mockUserRepo.users).toEqual([
    new User({
      ...props,
      systemRoles: [SystemRole.Admin],
    }),
  ]);
});
