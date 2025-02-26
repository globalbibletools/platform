import { expect, test, vi } from "vitest";
import Policy from "./Policy";
import fakeClaimsRepository from "../fakeClaimsRepository";

vi.mock("../claimsRepository", () => import("../fakeClaimsRepository"));

test("forbids access when policy has no roles", async () => {
  const policy = new Policy({});

  const adminActor = {
    id: "admin-actor",
    systemRoles: [Policy.SystemRole.Admin, Policy.SystemRole.User],
  };
  fakeClaimsRepository.initActor({
    actor: adminActor,
  });

  const result = policy.authorize({ actorId: adminActor.id });
  await expect(result).resolves.toEqual(false);
});

test("forbids access when actor is not found", async () => {
  const policy = new Policy({ systemRoles: [Policy.SystemRole.Admin] });

  const result = policy.authorize({ actorId: "random" });
  await expect(result).resolves.toEqual(false);
});

test("grants access when actor has system roles on policy", async () => {
  const policy = new Policy({ systemRoles: [Policy.SystemRole.Admin] });

  const adminActor = {
    id: "admin-actor",
    systemRoles: [Policy.SystemRole.Admin, Policy.SystemRole.User],
  };
  const userActor = {
    id: "user-actor",
    systemRoles: [Policy.SystemRole.User],
  };
  fakeClaimsRepository.initActor({
    actor: adminActor,
  });
  fakeClaimsRepository.initActor({ actor: userActor });

  await expect(policy.authorize({ actorId: adminActor.id })).resolves.toEqual(
    true,
  );
  await expect(policy.authorize({ actorId: userActor.id })).resolves.toEqual(
    false,
  );
});

test("grants access when actor has language roles on policy", async () => {
  const policy = new Policy({ languageRoles: [Policy.LanguageRole.Admin] });

  const adminActor = {
    id: "admin-actor",
    systemRoles: [Policy.SystemRole.User],
  };
  const adminLanguageRole = {
    code: "spa",
    roles: [Policy.LanguageRole.Admin, Policy.LanguageRole.Viewer],
  };
  const translatorActor = {
    id: "translator-actor",
    systemRoles: [Policy.SystemRole.User],
  };
  const translatorLanguageRole = {
    code: "spa",
    roles: [Policy.LanguageRole.Translator, Policy.LanguageRole.Viewer],
  };
  fakeClaimsRepository.initActor({
    actor: adminActor,
    languages: [adminLanguageRole],
  });
  fakeClaimsRepository.initActor({
    actor: translatorActor,
    languages: [translatorLanguageRole],
  });

  await expect(
    policy.authorize({ actorId: adminActor.id, languageCode: "spa" }),
  ).resolves.toEqual(true);
  await expect(
    policy.authorize({ actorId: translatorActor.id, languageCode: "spa" }),
  ).resolves.toEqual(false);
});
