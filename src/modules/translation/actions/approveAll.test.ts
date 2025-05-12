import "@/tests/vitest/mocks/nextjs";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { test, expect } from "vitest";
import { approveAll } from "./approveAll";
import { LanguageMemberRoleRaw } from "@/modules/languages/model";
import { createScenario, ScenarioDefinition } from "@/tests/scenarios";
import logIn from "@/tests/vitest/login";
import { glossFactory, phraseFactory } from "../test-utils/factories";
import {
  findGlossForPhrase,
  findGlossHistoryForPhrase,
} from "../test-utils/dbUtils";
import { GlossSourceRaw, GlossStateRaw } from "../data-access/GlossRepository";
import { faker } from "@faker-js/faker/locale/en";

initializeDatabase();

const scenarioDefinition: ScenarioDefinition = {
  users: {
    translator: {},
    admin: {},
  },
  languages: {
    spanish: {
      members: [
        { userId: "translator", roles: [LanguageMemberRoleRaw.Translator] },
        { userId: "admin", roles: [LanguageMemberRoleRaw.Admin] },
      ],
    },
  },
};

test("returns and does nothing if the request shape doesn't match the schema", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.translator.id);

  const formData = new FormData();
  const response = await approveAll(formData);
  expect(response).toBeUndefined();
});

test("returns not found if user is not logged in", async () => {
  const scenario = await createScenario(scenarioDefinition);

  const language = scenario.languages.spanish;

  const phrases = await phraseFactory.buildList(3, {
    languageId: language.id,
  });

  const formData = new FormData();
  formData.set("code", language.code);
  formData.set(`phrases[0][id]`, String(phrases[0].id));
  formData.set(`phrases[0][gloss]`, faker.lorem.word());
  formData.set(`phrases[1][id]`, String(phrases[1].id));
  formData.set(`phrases[1][gloss]`, faker.lorem.word());
  formData.set(`phrases[2][id]`, String(phrases[2].id));
  formData.set(`phrases[2][gloss]`, faker.lorem.word());
  await expect(approveAll(formData)).toBeNextjsNotFound();

  const updatedGloss1 = await findGlossForPhrase(phrases[0].id);
  expect(updatedGloss1).toBeUndefined();
  const updatedGloss2 = await findGlossForPhrase(phrases[1].id);
  expect(updatedGloss2).toBeUndefined();
  const updatedGloss3 = await findGlossForPhrase(phrases[2].id);
  expect(updatedGloss3).toBeUndefined();
});

test("returns not found if user is not a translator on the language", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.admin.id);

  const language = scenario.languages.spanish;

  const phrases = await phraseFactory.buildList(3, {
    languageId: language.id,
  });

  const formData = new FormData();
  formData.set("code", language.code);
  formData.set(`phrases[0][id]`, String(phrases[0].id));
  formData.set(`phrases[0][gloss]`, faker.lorem.word());
  formData.set(`phrases[1][id]`, String(phrases[1].id));
  formData.set(`phrases[1][gloss]`, faker.lorem.word());
  formData.set(`phrases[2][id]`, String(phrases[2].id));
  formData.set(`phrases[2][gloss]`, faker.lorem.word());
  await expect(approveAll(formData)).toBeNextjsNotFound();

  const updatedGloss1 = await findGlossForPhrase(phrases[0].id);
  expect(updatedGloss1).toBeUndefined();
  const updatedGloss2 = await findGlossForPhrase(phrases[1].id);
  expect(updatedGloss2).toBeUndefined();
  const updatedGloss3 = await findGlossForPhrase(phrases[2].id);
  expect(updatedGloss3).toBeUndefined();
});

test.todo("returns not found if a phrase does not exist");

test.todo("returns not found if a phrase is for a different language");

test("creates a new glosses and updates existing glosses for each phrase", async () => {
  const scenario = await createScenario(scenarioDefinition);
  const translator = scenario.users.translator;
  await logIn(translator.id);

  const language = scenario.languages.spanish;

  const phrases = await phraseFactory.buildList(3, {
    languageId: language.id,
  });
  const gloss = await glossFactory.build({
    phraseId: phrases[0].id,
  });

  const updatedGlosses = [
    faker.lorem.word(),
    faker.lorem.word(),
    faker.lorem.word(),
  ];

  const formData = new FormData();
  formData.set("code", language.code);
  formData.set(`phrases[0][id]`, String(phrases[0].id));
  formData.set(`phrases[0][gloss]`, updatedGlosses[0]);
  formData.set(`phrases[1][id]`, String(phrases[1].id));
  formData.set(`phrases[1][gloss]`, updatedGlosses[1]);
  formData.set(`phrases[2][id]`, String(phrases[2].id));
  formData.set(`phrases[2][gloss]`, updatedGlosses[2]);
  const result = await approveAll(formData);
  expect(result).toBeUndefined();

  const updatedGloss1 = await findGlossForPhrase(phrases[0].id);
  expect(updatedGloss1).toEqual({
    phraseId: phrases[0].id,
    gloss: updatedGlosses[0],
    state: GlossStateRaw.Approved,
    updatedAt: expect.toBeNow(),
    updatedBy: translator.id,
    source: GlossSourceRaw.User,
  });
  const updatedGloss1History = await findGlossHistoryForPhrase(phrases[0].id);
  expect(updatedGloss1History).toEqual([
    {
      id: expect.any(Number),
      ...gloss,
    },
  ]);

  const updatedGloss2 = await findGlossForPhrase(phrases[1].id);
  expect(updatedGloss2).toEqual({
    phraseId: phrases[1].id,
    gloss: updatedGlosses[1],
    state: GlossStateRaw.Approved,
    updatedAt: expect.toBeNow(),
    updatedBy: translator.id,
    source: GlossSourceRaw.User,
  });
  const updatedGloss2History = await findGlossHistoryForPhrase(phrases[1].id);
  expect(updatedGloss2History).toEqual([]);

  const updatedGloss3 = await findGlossForPhrase(phrases[2].id);
  expect(updatedGloss3).toEqual({
    phraseId: phrases[2].id,
    gloss: updatedGlosses[2],
    state: GlossStateRaw.Approved,
    updatedAt: expect.toBeNow(),
    updatedBy: translator.id,
    source: GlossSourceRaw.User,
  });
  const updatedGloss3History = await findGlossHistoryForPhrase(phrases[2].id);
  expect(updatedGloss3History).toEqual([]);

  // TODO: verify cache validation
});
