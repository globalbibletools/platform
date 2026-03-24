import { test, expect, vi } from "vitest";
import { logIn } from "./logIn";
import User from "../model/User";
import { IncorrectPasswordError } from "../model/errors";
import EmailStatus from "../model/EmailStatus";
import UserEmail from "../model/UserEmail";
import { NotFoundError } from "@/shared/errors";
import mockUserRepo from "../data-access/mockUserRepository";
import Password from "../model/Password";
import UserStatus from "../model/UserStatus";

vi.mock(
  "../data-access/userRepository",
  () => import("../data-access/mockUserRepository"),
);

test("returns error if no user is found", async () => {
  const request = {
    email: "test@example.com",
    password: "pa$$word",
  };
  await expect(logIn(request)).rejects.toThrow(new NotFoundError("User"));
});

test("returns error if password does not match", async () => {
  const user = new User({
    id: "user-id",
    email: new UserEmail({
      address: "test@example.com",
      status: EmailStatus.Verified,
    }),
    password: await Password.create("pa$$word"),
    passwordResets: [],
    invitations: [],
    status: UserStatus.Active,
    systemRoles: [],
  });
  mockUserRepo.users = [user];

  const request = {
    email: user.email.address,
    password: "wrong password",
  };
  await expect(logIn(request)).rejects.toThrow(new IncorrectPasswordError());
});

test("returns user id if password matches", async () => {
  const user = new User({
    id: "user-id",
    email: new UserEmail({
      address: "test@example.com",
      status: EmailStatus.Verified,
    }),
    password: await Password.create("pa$$word"),
    passwordResets: [],
    invitations: [],
    status: UserStatus.Active,
    systemRoles: [],
  });
  mockUserRepo.users = [user];

  const request = {
    email: user.email.address,
    password: "pa$$word",
  };
  await expect(logIn(request)).resolves.toEqual({
    userId: user.id,
  });
});
