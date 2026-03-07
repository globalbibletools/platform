import "@/tests/vitest/mocks/nextjs";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { test, expect } from "vitest";
import { updateGlossAction } from "./updateGloss";
import logIn from "@/tests/vitest/login";
import { phraseFactory } from "../test-utils/phraseFactory";
import {
  findGlossForPhrase,
  findGlossEventsForPhrase,
  findGlossHistoryForPhrase,
} from "../test-utils/dbUtils";
import {
  GlossApprovalMethodRaw,
  GlossSourceRaw,
  GlossStateRaw,
} from "../types";
import { languageFactory } from "@/modules/languages/test-utils/languageFactory";
import { userFactory } from "@/modules/users/test-utils/userFactory";
import { findTrackingEvents } from "@/modules/reporting/test-utils/dbUtils";

initializeDatabase();

test("returns and does nothing if the request shape doesn't match the schema", async () => {
  const { members } = await languageFactory.build();
  await logIn(members[0].user_id);

  const formData = new FormData();
  const response = await updateGlossAction(formData);
  expect(response).toBeUndefined();

  const events = await findTrackingEvents();
  expect(events).toEqual([]);
});

test("returns not found if user is not logged in", async () => {
  const { language } = await languageFactory.build();

  const { phrase } = await phraseFactory.build({
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

  const glossEvents = await findGlossEventsForPhrase(phrase.id);
  expect(glossEvents).toEqual([]);

  const events = await findTrackingEvents();
  expect(events).toEqual([]);
});

test("returns not found if user is not a translator on the language", async () => {
  const { language } = await languageFactory.build();
  const { user: nonmember } = await userFactory.build();
  await logIn(nonmember.id);

  const { phrase } = await phraseFactory.build({
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

  const glossEvents = await findGlossEventsForPhrase(phrase.id);
  expect(glossEvents).toEqual([]);

  const events = await findTrackingEvents();
  expect(events).toEqual([]);
});

test("returns not found if the phrase does not exist", async () => {
  const { language, members } = await languageFactory.build();
  await logIn(members[0].user_id);

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

  const glossEvents = await findGlossEventsForPhrase(123456);
  expect(glossEvents).toEqual([]);

  const events = await findTrackingEvents();
  expect(events).toEqual([]);
});

test("returns not found if the phrase is in a different language", async () => {
  const { user: translator } = await userFactory.build();
  const { language } = await languageFactory.build({
    members: [translator.id],
  });
  const { language: otherLanguage } = await languageFactory.build({
    members: [translator.id],
  });
  await logIn(translator.id);

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

  const glossEvents = await findGlossEventsForPhrase(123456);
  expect(glossEvents).toEqual([]);

  const events = await findTrackingEvents();
  expect(events).toEqual([]);
});

test("creates a new gloss for the phrase", async () => {
  const { language, members } = await languageFactory.build();
  const translatorId = members[0].user_id;
  await logIn(translatorId);

  const { phrase, words } = await phraseFactory.build({
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
    phrase_id: phrase.id,
    gloss: "asdf",
    state: GlossStateRaw.Approved,
    updated_at: expect.toBeNow(),
    updated_by: translatorId,
    source: GlossSourceRaw.User,
  });

  const glossHistory = await findGlossHistoryForPhrase(phrase.id);
  expect(glossHistory).toEqual([]);

  const glossEvents = await findGlossEventsForPhrase(phrase.id);
  expect(glossEvents).toEqual([
    {
      id: expect.toBeUlid(),
      phrase_id: phrase.id,
      language_id: language.id,
      user_id: translatorId,
      word_ids: null,
      word_id: words[0].id,
      timestamp: expect.toBeNow(),
      prev_gloss: "",
      prev_state: GlossStateRaw.Unapproved,
      new_gloss: "asdf",
      new_state: GlossStateRaw.Approved,
      approval_method: null,
    },
  ]);

  const events = await findTrackingEvents();
  expect(events).toEqual([]);

  // TODO: verify cache validation
});

test("creates a new gloss for the phrase and tracks approval", async () => {
  const { language, members } = await languageFactory.build();
  const translatorId = members[0].user_id;
  await logIn(translatorId);

  const { phrase, words } = await phraseFactory.build({
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
    phrase_id: phrase.id,
    gloss: "asdf",
    state: GlossStateRaw.Approved,
    updated_at: expect.toBeNow(),
    updated_by: translatorId,
    source: GlossSourceRaw.User,
  });

  const glossHistory = await findGlossHistoryForPhrase(phrase.id);
  expect(glossHistory).toEqual([]);

  const glossEvents = await findGlossEventsForPhrase(phrase.id);
  expect(glossEvents).toEqual([
    {
      id: expect.toBeUlid(),
      phrase_id: phrase.id,
      language_id: language.id,
      user_id: translatorId,
      word_ids: null,
      word_id: words[0].id,
      timestamp: expect.toBeNow(),
      prev_gloss: "",
      prev_state: GlossStateRaw.Unapproved,
      new_gloss: "asdf",
      new_state: GlossStateRaw.Approved,
      approval_method: GlossApprovalMethodRaw.MachineSuggestion,
    },
  ]);

  const events = await findTrackingEvents();
  expect(events).toEqual([
    {
      id: expect.toBeUlid(),
      type: "approved_gloss",
      data: {
        phraseId: phrase.id,
        method: GlossApprovalMethodRaw.MachineSuggestion,
      },
      user_id: translatorId,
      language_id: language.id,
      created_at: expect.toBeNow(),
    },
  ]);

  // TODO: verify cache validation
});

test("updates an existing gloss for the phrase", async () => {
  const { language, members } = await languageFactory.build();
  const translatorId = members[0].user_id;
  await logIn(translatorId);

  const { phrase, gloss, words } = await phraseFactory.build({
    languageId: language.id,
    gloss: "unapproved",
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
    phrase_id: phrase.id,
    gloss: "asdf",
    state: GlossStateRaw.Approved,
    updated_at: expect.toBeNow(),
    updated_by: translatorId,
    source: GlossSourceRaw.User,
  });

  const glossHistory = await findGlossHistoryForPhrase(phrase.id);
  expect(glossHistory).toEqual([
    {
      id: expect.any(Number),
      ...gloss,
    },
  ]);

  const glossEvents = await findGlossEventsForPhrase(phrase.id);
  expect(glossEvents).toEqual([
    {
      id: expect.toBeUlid(),
      phrase_id: phrase.id,
      language_id: language.id,
      user_id: translatorId,
      word_ids: null,
      word_id: words[0].id,
      timestamp: expect.toBeNow(),
      prev_gloss: gloss!.gloss ?? "",
      prev_state: gloss!.state,
      new_gloss: "asdf",
      new_state: GlossStateRaw.Approved,
      approval_method: null,
    },
  ]);

  const events = await findTrackingEvents();
  expect(events).toEqual([]);

  // TODO: verify cache validation
});

test("updates an existing gloss for the phrase and tracks approval", async () => {
  const { language, members } = await languageFactory.build();
  const translatorId = members[0].user_id;
  await logIn(translatorId);

  const { phrase, gloss, words } = await phraseFactory.build({
    languageId: language.id,
    gloss: "unapproved",
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
    phrase_id: phrase.id,
    gloss: "asdf",
    state: GlossStateRaw.Approved,
    updated_at: expect.toBeNow(),
    updated_by: translatorId,
    source: GlossSourceRaw.User,
  });

  const glossHistory = await findGlossHistoryForPhrase(phrase.id);
  expect(glossHistory).toEqual([
    {
      id: expect.any(Number),
      ...gloss,
    },
  ]);

  const glossEvents = await findGlossEventsForPhrase(phrase.id);
  expect(glossEvents).toEqual([
    {
      id: expect.toBeUlid(),
      phrase_id: phrase.id,
      language_id: language.id,
      user_id: translatorId,
      word_ids: null,
      word_id: words[0].id,
      timestamp: expect.toBeNow(),
      prev_gloss: gloss!.gloss ?? "",
      prev_state: gloss!.state,
      new_gloss: "asdf",
      new_state: GlossStateRaw.Approved,
      approval_method: GlossApprovalMethodRaw.GoogleSuggestion,
    },
  ]);

  const events = await findTrackingEvents();
  expect(events).toEqual([
    {
      id: expect.toBeUlid(),
      type: "approved_gloss",
      data: {
        phraseId: phrase.id,
        method: GlossApprovalMethodRaw.GoogleSuggestion,
      },
      user_id: translatorId,
      language_id: language.id,
      created_at: expect.toBeNow(),
    },
  ]);

  // TODO: verify cache validation
});
