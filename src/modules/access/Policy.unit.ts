import { beforeEach, describe, expect, test, vi } from "vitest";
import Policy from "./Policy";
import fakeClaimsRepository from "./fakeClaimsRepository";

vi.mock("./claimsRepository", () => import("./fakeClaimsRepository"));

test("forbids access when policy has no roles", async () => {
  const policy = new Policy({});

  const adminActor = {
    id: "admin-actor",
    systemRoles: [Policy.SystemRole.Admin],
  };
  beforeEach(() => {
    fakeClaimsRepository.initActor({
      actor: adminActor,
    });
  });

  const result = policy.authorize({ actorId: adminActor.id });
  await expect(result).resolves.toEqual(false);
});

test("forbids access when actor is not found", async () => {
  const policy = new Policy({ systemRoles: [Policy.SystemRole.Admin] });

  const result = policy.authorize({ actorId: "random" });
  await expect(result).resolves.toEqual(false);
});

describe("system role policy", () => {
  const policy = new Policy({ systemRoles: [Policy.SystemRole.Admin] });

  test("grants access when actor has the system roles on policy", async () => {
    const actor = {
      id: "actor",
      systemRoles: [Policy.SystemRole.Admin],
    };
    fakeClaimsRepository.initActor({
      actor: actor,
    });

    await expect(policy.authorize({ actorId: actor.id })).resolves.toEqual(
      true,
    );
  });

  test("denies access when actor does not have the system roles on policy", async () => {
    const actor = {
      id: "actor",
      systemRoles: [],
    };
    fakeClaimsRepository.initActor({
      actor: actor,
    });

    await expect(policy.authorize({ actorId: actor.id })).resolves.toEqual(
      false,
    );
  });
});

describe("language member policy", () => {
  const policy = new Policy({ languageMember: true });

  const actor = {
    id: "actor",
    systemRoles: [],
  };
  beforeEach(() => {
    fakeClaimsRepository.initActor({
      actor: actor,
      languages: [
        {
          code: "spa",
          isMember: true,
        },
      ],
    });
  });

  test("grants access when actor is a member of the language", async () => {
    await expect(
      policy.authorize({ actorId: actor.id, languageCode: "spa" }),
    ).resolves.toEqual(true);
  });

  test("denies access when actor is not a member of the language", async () => {
    await expect(
      policy.authorize({ actorId: actor.id, languageCode: "eng" }),
    ).resolves.toEqual(false);
  });
});
