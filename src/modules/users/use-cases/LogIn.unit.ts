import { test, expect, beforeEach } from "vitest";
import LogIn from "./LogIn";
import User from "../model/User";
import { IncorrectPasswordError } from "../model/errors";
import EmailStatus from "../model/EmailStatus";
import UserEmail from "../model/UserEmail";
import UserAuthentication from "../model/UserAuthentication";
import { Scrypt } from "oslo/password";
import { NotFoundError } from "@/shared/errors";
import mockUserRepo from "../data-access/MockUserRepository";

const logIn = new LogIn(mockUserRepo);

test("returns error if no user is found", async () => {
  const request = {
    email: "test@example.com",
    password: "pa$$word",
  };
  await expect(logIn.execute(request)).rejects.toThrow(
    new NotFoundError("User"),
  );
});

test("returns error if password does not match", async () => {
  const user = new User({
    id: "user-id",
    email: new UserEmail({
      address: "test@example.com",
      status: EmailStatus.Verified,
    }),
    auth: new UserAuthentication({
      hashedPassword: await new Scrypt().hash("asdf1234"),
      resets: [],
    }),
  });
  mockUserRepo.users = [user];

  const request = {
    email: user.email.address,
    password: "pa$$word",
  };
  await expect(logIn.execute(request)).rejects.toThrow(
    new IncorrectPasswordError(),
  );
});

test("returns user id if password matches", async () => {
  const user = new User({
    id: "user-id",
    email: new UserEmail({
      address: "test@example.com",
      status: EmailStatus.Verified,
    }),
    auth: new UserAuthentication({
      hashedPassword: await new Scrypt().hash("pa$$word"),
      resets: [],
    }),
  });
  mockUserRepo.users = [user];

  const request = {
    email: user.email.address,
    password: "pa$$word",
  };
  await expect(logIn.execute(request)).resolves.toEqual({
    userId: user.id,
  });
});
