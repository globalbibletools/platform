import "@/tests/vitest/mocks/nextjs";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { test, expect } from "vitest";
import { LanguageMemberRoleRaw } from "@/modules/languages/model";
import { createScenario, ScenarioDefinition } from "@/tests/scenarios";
import logIn from "@/tests/vitest/login";
import { footnoteFactory, phraseFactory } from "../test-utils/factories";
import { findFootnoteForPhrase } from "../test-utils/dbUtils";
import { updateFootnoteAction } from "./updateFootnote";

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
  const response = await updateFootnoteAction(formData);
  expect(response).toBeUndefined();
});

test("returns not found if user is not logged in", async () => {
  const scenario = await createScenario(scenarioDefinition);

  const language = scenario.languages.spanish;

  const phrase = await phraseFactory.build({
    languageId: language.id,
  });

  const formData = new FormData();
  formData.set("languageCode", language.code);
  formData.set("phraseId", String(phrase.id));
  formData.set("note", "<p>Note text</p>");
  await expect(updateFootnoteAction(formData)).toBeNextjsNotFound();

  const footnote = await findFootnoteForPhrase(phrase.id);
  expect(footnote).toBeUndefined();
});

test("returns not found if user is not a translator on the language", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.admin.id);

  const language = scenario.languages.spanish;

  const phrase = await phraseFactory.build({
    languageId: language.id,
  });

  const formData = new FormData();
  formData.set("languageCode", language.code);
  formData.set("phraseId", String(phrase.id));
  formData.set("note", "<p>Note text</p>");
  await expect(updateFootnoteAction(formData)).toBeNextjsNotFound();

  const footnote = await findFootnoteForPhrase(phrase.id);
  expect(footnote).toBeUndefined();
});

test("returns not found if the phrase does not exist", async () => {
  const scenario = await createScenario(scenarioDefinition);
  await logIn(scenario.users.translator.id);

  const language = scenario.languages.spanish;

  const formData = new FormData();
  formData.set("languageCode", language.code);
  formData.set("phraseId", "123456");
  formData.set("note", "<p>Note text</p>");
  await expect(updateFootnoteAction(formData)).toBeNextjsNotFound();

  const footnote = await findFootnoteForPhrase(123456);
  expect(footnote).toBeUndefined();
});

test("returns not found if phrase is not in the language", async () => {
  const scenario = await createScenario(scenarioDefinition, {
    languages: {
      another: {
        members: [
          { userId: "translator", roles: [LanguageMemberRoleRaw.Translator] },
        ],
      },
    },
  });
  await logIn(scenario.users.admin.id);

  const language = scenario.languages.spanish;

  const phrase = await phraseFactory.build({
    languageId: language.id,
  });

  const formData = new FormData();
  formData.set("languageCode", scenario.languages.another.code);
  formData.set("phraseId", String(phrase.id));
  formData.set("note", "<p>Note text</p>");
  await expect(updateFootnoteAction(formData)).toBeNextjsNotFound();

  const footnote = await findFootnoteForPhrase(phrase.id);
  expect(footnote).toBeUndefined();
});

test("creates a new footnote for the phrase", async () => {
  const scenario = await createScenario(scenarioDefinition);
  const translator = scenario.users.translator;
  await logIn(translator.id);

  const language = scenario.languages.spanish;

  const phrase = await phraseFactory.build({
    languageId: language.id,
  });
  const content = "<p>Note text</p>";

  const formData = new FormData();
  formData.set("languageCode", language.code);
  formData.set("phraseId", String(phrase.id));
  formData.set("note", content);
  const result = await updateFootnoteAction(formData);
  expect(result).toBeUndefined();

  const footnote = await findFootnoteForPhrase(phrase.id);
  expect(footnote).toEqual({
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
  const footnote = await footnoteFactory.build({
    phraseId: phrase.id,
    authorId: translator.id,
  });
  const content = "<p>Note text</p>";

  const formData = new FormData();
  formData.set("languageCode", language.code);
  formData.set("phraseId", String(phrase.id));
  formData.set("note", content);
  const result = await updateFootnoteAction(formData);
  expect(result).toBeUndefined();

  const updatedFootnote = await findFootnoteForPhrase(phrase.id);
  expect(updatedFootnote).toEqual({
    phraseId: phrase.id,
    content,
    timestamp: expect.toBeNow(),
    authorId: translator.id,
  });

  // TODO: verify cache validation
});
