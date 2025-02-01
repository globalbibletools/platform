import { test, describe, expect } from "vitest";
import UserPolicy from "./UserPolicy";
import SystemRole from "./SystemRole";

function createPolicy(options: { systemRoles?: SystemRole[] } = {}) {
  return new UserPolicy({
    systemRoles: options.systemRoles ?? [],
    userId: "userid-1234",
  });
}

describe("replaceSystemRoles", () => {
  test("updates system roles on user policy", () => {
    const userPolicy = createPolicy();
    userPolicy.replaceSystemRoles([SystemRole.Admin]);
    expect(userPolicy.systemRoles).toEqual([SystemRole.Admin]);
  });
});

describe("permissions for user-access", () => {
  test("grant update to system admins", () => {
    const userPolicy = createPolicy({ systemRoles: [SystemRole.Admin] });
    const canAccess = userPolicy.verifyAction({
      action: "update",
      resourceType: "user-access",
      resourceId: "asdf",
    });
    expect(canAccess).toEqual(true);
  });

  test("deny update to normal users", () => {
    const userPolicy = createPolicy();
    const canAccess = userPolicy.verifyAction({
      action: "update",
      resourceType: "user-access",
      resourceId: "asdf",
    });
    expect(canAccess).toEqual(false);
  });
});

describe("permissions for language", () => {
  test("grant create to system admins", () => {
    const userPolicy = createPolicy({ systemRoles: [SystemRole.Admin] });
    const canAccess = userPolicy.verifyAction({
      action: "create",
      resourceType: "language",
    });
    expect(canAccess).toEqual(true);
  });

  test("deny create to normal users", () => {
    const userPolicy = createPolicy();
    const canAccess = userPolicy.verifyAction({
      action: "create",
      resourceType: "language",
    });
    expect(canAccess).toEqual(false);
  });
});
