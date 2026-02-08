import "@/tests/vitest/mocks/nextjs";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { test, expect } from "vitest";
import { createScenario, ScenarioDefinition } from "@/tests/scenarios";
import logIn from "@/tests/vitest/login";
import { translatorNoteFactory, phraseFactory } from "../test-utils/factories";
import { findTranslatorNoteForPhrase } from "../test-utils/dbUtils";
import { updateTranslatorNoteAction } from "./updateTranslatorNote";

initializeDatabase();

const scenarioDefinition: ScenarioDefinition = {
  users: {
    translator: {},
    nonmember: {},
  },
  languages: {
    spanish: {
      members: ["translator"],
    },
  },
};

test("returns and does nothing if the request shape doesn't match the schema", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.translator.id);

  const formData = new FormData();
  const response = await updateTranslatorNoteAction(formData);
  expect(response).toBeUndefined();
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
  formData.set("note", "<p>Note text</p>");
  await expect(updateTranslatorNoteAction(formData)).toBeNextjsNotFound();

  const translatorNote = await findTranslatorNoteForPhrase(phrase.id);
  expect(translatorNote).toBeUndefined();
});

test("returns not found if user is not a translator on the language", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.nonmember.id);

  const language = scenario.languages.spanish;

  const phrase = await phraseFactory.build({
    languageId: language.id,
  });

  const formData = new FormData();
  formData.set("verseId", "123");
  formData.set("languageCode", language.code);
  formData.set("phraseId", String(phrase.id));
  formData.set("note", "<p>Note text</p>");
  await expect(updateTranslatorNoteAction(formData)).toBeNextjsNotFound();

  const translatorNote = await findTranslatorNoteForPhrase(phrase.id);
  expect(translatorNote).toBeUndefined();
});

test("returns not found if the phrase does not exist", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.translator.id);

  const language = scenario.languages.spanish;

  const formData = new FormData();
  formData.set("verseId", "123");
  formData.set("languageCode", language.code);
  formData.set("phraseId", "123456");
  formData.set("note", "<p>Note text</p>");
  await expect(updateTranslatorNoteAction(formData)).toBeNextjsNotFound();

  const translatorNote = await findTranslatorNoteForPhrase(123456);
  expect(translatorNote).toBeUndefined();
});

test("returns not found if phrase is not in the language", async () => {
  const scenario = await createScenario(scenarioDefinition, {
    languages: {
      another: {
        members: ["translator"],
      },
    },
  });
  await logIn(scenario.users.translator.id);

  const language = scenario.languages.spanish;

  const phrase = await phraseFactory.build({
    languageId: language.id,
  });

  const formData = new FormData();
  formData.set("verseId", "123");
  formData.set("languageCode", scenario.languages.another.code);
  formData.set("phraseId", String(phrase.id));
  formData.set("note", "<p>Note text</p>");
  await expect(updateTranslatorNoteAction(formData)).toBeNextjsNotFound();

  const translatorNote = await findTranslatorNoteForPhrase(phrase.id);
  expect(translatorNote).toBeUndefined();
});

test("creates a new translatorNote for the phrase", async () => {
  const scenario = await createScenario(scenarioDefinition);
  const translator = scenario.users.translator;
  await logIn(translator.id);

  const language = scenario.languages.spanish;

  const phrase = await phraseFactory.build({
    languageId: language.id,
  });
  const content = "<p>Note text</p>";

  const formData = new FormData();
  formData.set("verseId", "123");
  formData.set("languageCode", language.code);
  formData.set("phraseId", String(phrase.id));
  formData.set("note", content);
  const result = await updateTranslatorNoteAction(formData);
  expect(result).toBeUndefined();

  const translatorNote = await findTranslatorNoteForPhrase(phrase.id);
  expect(translatorNote).toEqual({
    phraseId: phrase.id,
    content,
    timestamp: expect.toBeNow(),
    authorId: translator.id,
  });

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
  await translatorNoteFactory.build({
    phraseId: phrase.id,
    authorId: translator.id,
  });
  const content = "<p>Note text</p>";

  const formData = new FormData();
  formData.set("verseId", "123");
  formData.set("languageCode", language.code);
  formData.set("phraseId", String(phrase.id));
  formData.set("note", content);
  const result = await updateTranslatorNoteAction(formData);
  expect(result).toBeUndefined();

  const updatedTranslatorNote = await findTranslatorNoteForPhrase(phrase.id);
  expect(updatedTranslatorNote).toEqual({
    phraseId: phrase.id,
    content,
    timestamp: expect.toBeNow(),
    authorId: translator.id,
  });

  // TODO: verify cache validation
});
