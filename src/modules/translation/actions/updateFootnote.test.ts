import "@/tests/vitest/mocks/nextjs";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { test, expect } from "vitest";
import logIn from "@/tests/vitest/login";
import { footnoteFactory, phraseFactory } from "../test-utils/factories";
import { findFootnoteForPhrase } from "../test-utils/dbUtils";
import { updateFootnoteAction } from "./updateFootnote";
import { languageFactory } from "@/modules/languages/test-utils/languageFactory";
import { userFactory } from "@/modules/users/test-utils/userFactory";

initializeDatabase();

test("returns and does nothing if the request shape doesn't match the schema", async () => {
  const { members } = await languageFactory.build();
  await logIn(members[0].user_id);

  const formData = new FormData();
  const response = await updateFootnoteAction(formData);
  expect(response).toBeUndefined();
});

test("returns not found if user is not logged in", async () => {
  const { language } = await languageFactory.build();

  const phrase = await phraseFactory.build({
    languageId: language.id,
  });

  const formData = new FormData();
  formData.set("verseId", "123");
  formData.set("languageCode", language.code);
  formData.set("phraseId", String(phrase.id));
  formData.set("note", "<p>Note text</p>");
  await expect(updateFootnoteAction(formData)).toBeNextjsNotFound();

  const footnote = await findFootnoteForPhrase(phrase.id);
  expect(footnote).toBeUndefined();
});

test("returns not found if user is not a translator on the language", async () => {
  const { language } = await languageFactory.build();
  const { user: nonmember } = await userFactory.build();
  await logIn(nonmember.id);

  const phrase = await phraseFactory.build({
    languageId: language.id,
  });

  const formData = new FormData();
  formData.set("verseId", "123");
  formData.set("languageCode", language.code);
  formData.set("phraseId", String(phrase.id));
  formData.set("note", "<p>Note text</p>");
  await expect(updateFootnoteAction(formData)).toBeNextjsNotFound();

  const footnote = await findFootnoteForPhrase(phrase.id);
  expect(footnote).toBeUndefined();
});

test("returns not found if the phrase does not exist", async () => {
  const { language, members } = await languageFactory.build();
  await logIn(members[0].user_id);

  const formData = new FormData();
  formData.set("verseId", "123");
  formData.set("languageCode", language.code);
  formData.set("phraseId", "123456");
  formData.set("note", "<p>Note text</p>");
  await expect(updateFootnoteAction(formData)).toBeNextjsNotFound();

  const footnote = await findFootnoteForPhrase(123456);
  expect(footnote).toBeUndefined();
});

test("returns not found if phrase is not in the language", async () => {
  const { user: translator } = await userFactory.build();
  const { language } = await languageFactory.build({
    members: [translator.id],
  });
  const { language: anotherLanguage } = await languageFactory.build({
    members: [translator.id],
  });
  await logIn(translator.id);

  const phrase = await phraseFactory.build({
    languageId: language.id,
  });

  const formData = new FormData();
  formData.set("verseId", "123");
  formData.set("languageCode", anotherLanguage.code);
  formData.set("phraseId", String(phrase.id));
  formData.set("note", "<p>Note text</p>");
  await expect(updateFootnoteAction(formData)).toBeNextjsNotFound();

  const footnote = await findFootnoteForPhrase(phrase.id);
  expect(footnote).toBeUndefined();
});

test("creates a new footnote for the phrase", async () => {
  const { language, members } = await languageFactory.build();
  const translatorId = members[0].user_id;
  await logIn(translatorId);

  const phrase = await phraseFactory.build({
    languageId: language.id,
  });
  const content = "<p>Note text</p>";

  const formData = new FormData();
  formData.set("verseId", "123");
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
    authorId: translatorId,
  });

  // TODO: verify cache validation
});

test("updates an existing gloss for the phrase", async () => {
  const { language, members } = await languageFactory.build();
  const translatorId = members[0].user_id;
  await logIn(translatorId);

  const phrase = await phraseFactory.build({
    languageId: language.id,
  });
  await footnoteFactory.build({
    phraseId: phrase.id,
    authorId: translatorId,
  });
  const content = "<p>Note text</p>";

  const formData = new FormData();
  formData.set("verseId", "123");
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
    authorId: translatorId,
  });

  // TODO: verify cache validation
});
