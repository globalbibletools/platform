import "@/tests/vitest/mocks/nextjs";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { test, expect } from "vitest";
import { updateGloss } from "./updateGloss";
import { LanguageMemberRoleRaw } from "@/modules/languages/model";
import { createScenario, ScenarioDefinition } from "@/tests/scenarios";
import logIn from "@/tests/vitest/login";
import { glossFactory, phraseFactory } from "../test-utils/factories";
import {
  findGlossForPhrase,
  findGlossHistoryForPhrase,
} from "../test-utils/dbUtils";
import { GlossSourceRaw, GlossStateRaw } from "../data-access/GlossRepository";

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
  const response = await updateGloss(formData);
  expect(response).toBeUndefined();
});

test("returns not found if user is not logged in", async () => {
  const scenario = await createScenario(scenarioDefinition);

  const language = scenario.languages.spanish;

  const phrase = await phraseFactory.build({
    languageId: language.id,
  });

  const formData = new FormData();
  formData.set("phraseId", String(phrase.id));
  formData.set("gloss", "asdf");
  formData.set("state", "APPROVED");
  formData.set("languageCode", language.code);
  await expect(updateGloss(formData)).toBeNextjsNotFound();

  const gloss = await findGlossForPhrase(phrase.id);
  expect(gloss).toBeUndefined();
});

test("returns not found if user is not a translator on the language", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.admin.id);

  const language = scenario.languages.spanish;

  const phrase = await phraseFactory.build({
    languageId: language.id,
  });

  const formData = new FormData();
  formData.set("phraseId", String(phrase.id));
  formData.set("gloss", "asdf");
  formData.set("state", "APPROVED");
  formData.set("languageCode", language.code);
  await expect(updateGloss(formData)).toBeNextjsNotFound();

  const gloss = await findGlossForPhrase(phrase.id);
  expect(gloss).toBeUndefined();
});

test("returns not found if the phrase does not exist", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.translator.id);

  const language = scenario.languages.spanish;

  const formData = new FormData();
  formData.set("phraseId", "123456");
  formData.set("gloss", "asdf");
  formData.set("state", "APPROVED");
  formData.set("languageCode", language.code);
  await expect(updateGloss(formData)).toBeNextjsNotFound();

  const gloss = await findGlossForPhrase(123456);
  expect(gloss).toBeUndefined();
});

test("creates a new gloss for the phrase", async () => {
  const scenario = await createScenario(scenarioDefinition);
  const translator = scenario.users.translator;
  await logIn(translator.id);

  const language = scenario.languages.spanish;

  const phrase = await phraseFactory.build({
    languageId: language.id,
  });

  const formData = new FormData();
  formData.set("phraseId", String(phrase.id));
  formData.set("gloss", "asdf");
  formData.set("state", GlossStateRaw.Approved);
  formData.set("languageCode", language.code);
  const result = await updateGloss(formData);
  expect(result).toBeUndefined();

  const gloss = await findGlossForPhrase(phrase.id);
  expect(gloss).toEqual({
    phraseId: phrase.id,
    gloss: "asdf",
    state: GlossStateRaw.Approved,
    updatedAt: expect.toBeNow(),
    updatedBy: translator.id,
    source: GlossSourceRaw.User,
  });

  const glossHistory = await findGlossHistoryForPhrase(phrase.id);
  expect(glossHistory).toEqual([]);

  // TODO: verify cache validation
});

test("updates an existing gloss for the phrase", async () => {
  const scenario = await createScenario(scenarioDefinition);
  const translator = scenario.users.translator;
  await logIn(translator.id);

  const language = scenario.languages.spanish;

  const phrase = await phraseFactory.build({
    languageId: language.id,
  });
  const gloss = await glossFactory.build({
    phraseId: phrase.id,
  });

  const formData = new FormData();
  formData.set("phraseId", String(phrase.id));
  formData.set("gloss", "asdf");
  formData.set("state", GlossStateRaw.Approved);
  formData.set("languageCode", language.code);
  const result = await updateGloss(formData);
  expect(result).toBeUndefined();

  const updatedGloss = await findGlossForPhrase(phrase.id);
  expect(updatedGloss).toEqual({
    phraseId: phrase.id,
    gloss: "asdf",
    state: GlossStateRaw.Approved,
    updatedAt: expect.toBeNow(),
    updatedBy: translator.id,
    source: GlossSourceRaw.User,
  });

  const glossHistory = await findGlossHistoryForPhrase(phrase.id);
  expect(glossHistory).toEqual([
    {
      id: expect.any(Number),
      ...gloss,
    },
  ]);

  // TODO: verify cache validation
});
