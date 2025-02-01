import { test, expect, beforeEach } from "vitest";
import MockUserPolicyRepository from "../data-access/MockUserPolicyRepository";
import { SystemRoleValue } from "../model/SystemRole";
import VerifyUserAction from "./VerifyUserAction";
import { UnauthorizedError } from "../errors";

let userPolicyRepo = new MockUserPolicyRepository();
const verifyUserAction = new VerifyUserAction(userPolicyRepo);

beforeEach(() => {
  userPolicyRepo.reset();
});

test.todo("returns not found error if user does not exist");

test("prohibits access for the public", async () => {
  const request = {
    action: "create" as const,
    resourceType: "language" as const,
  };
  await expect(verifyUserAction.execute(request)).rejects.toThrowError(
    new UnauthorizedError(),
  );

  expect(userPolicyRepo.testData).toEqual([]);
});

test.todo("grants access for the public");

test("prohibits access for the user", async () => {
  const policy = {
    userId: "user-id-asdf",
    systemRoles: [],
  };
  userPolicyRepo.seed([policy]);

  const request = {
    action: "create" as const,
    resourceType: "language" as const,
    userId: policy.userId,
  };
  await expect(verifyUserAction.execute(request)).rejects.toThrowError(
    new UnauthorizedError(),
  );

  expect(userPolicyRepo.testData).toEqual([policy]);
});

test("grants access for the user", async () => {
  const policy = {
    userId: "user-id-asdf",
    systemRoles: [SystemRoleValue.Admin],
  };
  userPolicyRepo.seed([policy]);

  const request = {
    action: "create" as const,
    resourceType: "language" as const,
    userId: policy.userId,
  };
  await expect(verifyUserAction.execute(request)).resolves.toBeUndefined();

  expect(userPolicyRepo.testData).toEqual([policy]);
});
