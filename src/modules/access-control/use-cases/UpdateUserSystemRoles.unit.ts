import { test, vi, expect, Mocked, beforeEach } from "vitest";
import UpdateUserSystemRoles from "./UpdateUserSystemRoles";
import MockUserPolicyRepository from "../data-access/MockUserPolicyRepository";
import { SystemRoleValue } from "../model/SystemRole";

let userPolicyRepo = new MockUserPolicyRepository();
const updateUserSystemRoles = new UpdateUserSystemRoles(userPolicyRepo);

beforeEach(() => {
  userPolicyRepo.reset();
});

test.todo("returns not found error if user does not exist");

test("returns error if invalid system role is passed", async () => {
  const request = {
    userId: "user-id-asdf",
    systemRoles: ["Invalid" as any],
  };

  await expect(updateUserSystemRoles.execute(request)).rejects.toThrowError(
    new Error(`Invalid UserSystemRole: ${request.systemRoles[0]}`),
  );

  expect(userPolicyRepo.testData).toEqual([]);
});

test("replaces all system roles for the user", async () => {
  const request = {
    userId: "user-id-asdf",
    systemRoles: [SystemRoleValue.Admin],
  };

  await expect(updateUserSystemRoles.execute(request)).resolves.toBeUndefined();

  expect(userPolicyRepo.testData).toEqual([request]);
});
