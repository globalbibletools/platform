import { describe, expect, test } from "vitest";
import Policy from "./Policy";
import { SystemRoleRaw } from "../users";

describe("empty policy policy", () => {
  const policy = new Policy({});

  test("forbids access when unauthenticated", () => {
    const result = policy.authorize({});
    expect(result).toEqual(false);
  });

  test("forbids access when authenticated", () => {
    const result = policy.authorize({
      actor: { id: "actor", systemRoles: [] },
    });
    expect(result).toEqual(false);
  });

  test("forbids access to admins", () => {
    const result = policy.authorize({
      actor: { id: "actor", systemRoles: [Policy.SystemRole.Admin] },
    });
    expect(result).toEqual(false);
  });
});

describe("unauthenticated policy", () => {
  const policy = new Policy({ authenticated: true });

  test("forbids access when not logged in", () => {
    const result = policy.authorize({});
    expect(result).toEqual(false);
  });

  test("grants access when logged in", () => {
    const policy = new Policy({ authenticated: false });

    const result = policy.authorize({ actor: { id: "asdf", systemRoles: [] } });
    expect(result).toEqual(true);
  });
});

describe("unauthenticated policy", () => {
  const policy = new Policy({ authenticated: false });

  test("grants access when not logged in", () => {
    const result = policy.authorize({});
    expect(result).toEqual(false);
  });

  test("forbids access when logged in", () => {
    const policy = new Policy({ authenticated: false });

    const result = policy.authorize({ actor: { id: "asdf", systemRoles: [] } });
    expect(result).toEqual(false);
  });
});

describe("system role policy", () => {
  const policy = new Policy({ systemRoles: [Policy.SystemRole.Admin] });

  test("grants access when actor has the system roles on policy", () => {
    const result = policy.authorize({
      actor: { id: "actor", systemRoles: [Policy.SystemRole.Admin] },
    });
    expect(result).toEqual(true);
  });

  test("denies access when actor does not have the system roles on policy", () => {
    const result = policy.authorize({
      actor: { id: "actor", systemRoles: [] },
    });
    expect(result).toEqual(false);
  });

  test("denies access when not authenticated", () => {
    const result = policy.authorize({});
    expect(result).toEqual(false);
  });
});

describe("language member policy", () => {
  const policy = new Policy({ languageMember: true });

  test("grants access when actor is a member of the language", () => {
    const result = policy.authorize({
      actor: { id: "actor", systemRoles: [] },
      language: { code: "spa", isMember: true },
    });
    expect(result).toEqual(true);
  });

  test("denies access when actor is not a member of the language", () => {
    const result = policy.authorize({
      actor: { id: "actor", systemRoles: [] },
      language: { code: "eng", isMember: false },
    });
    expect(result).toEqual(false);
  });

  test("denies access for admins", () => {
    const result = policy.authorize({
      actor: { id: "actor", systemRoles: [SystemRoleRaw.Admin] },
      language: { code: "eng", isMember: false },
    });
    expect(result).toEqual(false);
  });

  test("denies access if not logged in", () => {
    const result = policy.authorize({
      language: { code: "eng", isMember: false },
    });
    expect(result).toEqual(false);
  });
});
