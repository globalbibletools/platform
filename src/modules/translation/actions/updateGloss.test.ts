import "@/tests/vitest/mocks/nextjs";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { vitest, test, expect } from "vitest";
import { updateGlossAction } from "./updateGloss";
import { LanguageMemberRoleRaw } from "@/modules/languages/model";
import { createScenario, ScenarioDefinition } from "@/tests/scenarios";
import logIn from "@/tests/vitest/login";
import { glossFactory, phraseFactory } from "../test-utils/factories";
import {
  findGlossForPhrase,
  findGlossHistoryForPhrase,
} from "../test-utils/dbUtils";
import {
  GlossApprovalMethodRaw,
  GlossSourceRaw,
  GlossStateRaw,
} from "../types";
import trackingClient from "@/modules/reporting/public/trackingClient";

initializeDatabase();

vitest.mock("@/modules/reporting/public/trackingClient");

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
  const response = await updateGlossAction(formData);
  expect(response).toBeUndefined();

  expect(trackingClient.trackEvent).not.toHaveBeenCalled();
});

test("returns not found if user is not logged in", async () => {
  const scenario = await createScenario(scenarioDefinition);

  const language = scenario.languages.spanish;

  const phrase = await phraseFactory.build({
    languageId: language.id,
  });

  const formData = new FormData();
  formData.set("verseId", "123");
  formData.set("languageCode", language.code);
  formData.set("phraseId", String(phrase.id));
  formData.set("gloss", "asdf");
  formData.set("state", "APPROVED");
  formData.set("languageCode", language.code);
  await expect(updateGlossAction(formData)).toBeNextjsNotFound();

  const gloss = await findGlossForPhrase(phrase.id);
  expect(gloss).toBeUndefined();

  expect(trackingClient.trackEvent).not.toHaveBeenCalled();
});

test("returns not found if user is not a translator on the language", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.admin.id);

  const language = scenario.languages.spanish;

  const phrase = await phraseFactory.build({
    languageId: language.id,
  });

  const formData = new FormData();
  formData.set("verseId", "123");
  formData.set("languageCode", language.code);
  formData.set("phraseId", String(phrase.id));
  formData.set("gloss", "asdf");
  formData.set("state", "APPROVED");
  formData.set("languageCode", language.code);
  await expect(updateGlossAction(formData)).toBeNextjsNotFound();

  const gloss = await findGlossForPhrase(phrase.id);
  expect(gloss).toBeUndefined();

  expect(trackingClient.trackEvent).not.toHaveBeenCalled();
});

test("returns not found if the phrase does not exist", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.translator.id);

  const language = scenario.languages.spanish;

  const formData = new FormData();
  formData.set("verseId", "123");
  formData.set("languageCode", language.code);
  formData.set("phraseId", "123456");
  formData.set("gloss", "asdf");
  formData.set("state", "APPROVED");
  formData.set("languageCode", language.code);
  await expect(updateGlossAction(formData)).toBeNextjsNotFound();

  const gloss = await findGlossForPhrase(123456);
  expect(gloss).toBeUndefined();

  expect(trackingClient.trackEvent).not.toHaveBeenCalled();
});

test("returns not found if the phrase is in a different language", async () => {
  const scenario = await createScenario(scenarioDefinition, {
    languages: {
      another: {
        members: [
          { userId: "translator", roles: [LanguageMemberRoleRaw.Translator] },
        ],
      },
    },
  });
  await logIn(scenario.users.translator.id);

  const language = scenario.languages.spanish;
  const otherLanguage = scenario.languages.another;

  const formData = new FormData();
  formData.set("verseId", "123");
  formData.set("languageCode", otherLanguage.code);
  formData.set("phraseId", "123456");
  formData.set("gloss", "asdf");
  formData.set("state", "APPROVED");
  formData.set("languageCode", language.code);
  await expect(updateGlossAction(formData)).toBeNextjsNotFound();

  const gloss = await findGlossForPhrase(123456);
  expect(gloss).toBeUndefined();

  expect(trackingClient.trackEvent).not.toHaveBeenCalled();
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
  formData.set("verseId", "123");
  formData.set("languageCode", language.code);
  formData.set("phraseId", String(phrase.id));
  formData.set("gloss", "asdf");
  formData.set("state", GlossStateRaw.Approved);
  formData.set("languageCode", language.code);
  const result = await updateGlossAction(formData);
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

  expect(trackingClient.trackEvent).not.toHaveBeenCalled();

  // TODO: verify cache validation
});

test("creates a new gloss for the phrase and tracks approval", async () => {
  const scenario = await createScenario(scenarioDefinition);
  const translator = scenario.users.translator;
  await logIn(translator.id);

  const language = scenario.languages.spanish;

  const phrase = await phraseFactory.build({
    languageId: language.id,
  });

  const formData = new FormData();
  formData.set("verseId", "123");
  formData.set("languageCode", language.code);
  formData.set("phraseId", String(phrase.id));
  formData.set("gloss", "asdf");
  formData.set("state", GlossStateRaw.Approved);
  formData.set("languageCode", language.code);
  formData.set("method", GlossApprovalMethodRaw.MachineSuggestion);
  const result = await updateGlossAction(formData);
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

  expect(trackingClient.trackEvent).toHaveBeenCalledExactlyOnceWith(
    "approved_gloss",
    {
      languageId: language.id,
      userId: translator.id,
      method: GlossApprovalMethodRaw.MachineSuggestion,
    },
  );

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
  formData.set("verseId", "123");
  formData.set("languageCode", language.code);
  formData.set("phraseId", String(phrase.id));
  formData.set("gloss", "asdf");
  formData.set("state", GlossStateRaw.Approved);
  formData.set("languageCode", language.code);
  const result = await updateGlossAction(formData);
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

  expect(trackingClient.trackEvent).not.toHaveBeenCalled();

  // TODO: verify cache validation
});

test("updates an existing gloss for the phrase and tracks approval", async () => {
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
  formData.set("verseId", "123");
  formData.set("languageCode", language.code);
  formData.set("phraseId", String(phrase.id));
  formData.set("gloss", "asdf");
  formData.set("state", GlossStateRaw.Approved);
  formData.set("languageCode", language.code);
  formData.set("method", GlossApprovalMethodRaw.GoogleSuggestion);
  const result = await updateGlossAction(formData);
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

  expect(trackingClient.trackEvent).toHaveBeenCalledExactlyOnceWith(
    "approved_gloss",
    {
      languageId: language.id,
      userId: translator.id,
      method: GlossApprovalMethodRaw.GoogleSuggestion,
    },
  );

  // TODO: verify cache validation
});
