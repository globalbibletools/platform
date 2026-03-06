import "@/tests/vitest/mocks/nextjs";
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { test, expect } from "vitest";
import { approveAll } from "./approveAll";
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
import { faker } from "@faker-js/faker/locale/en";
import { languageFactory } from "@/modules/languages/test-utils/languageFactory";
import { userFactory } from "@/modules/users/test-utils/userFactory";
import { findTrackingEvents } from "@/modules/reporting/test-utils/dbUtils";

initializeDatabase();

test("returns and does nothing if the request shape doesn't match the schema", async () => {
  const { members } = await languageFactory.build();
  await logIn(members[0].user_id);

  const formData = new FormData();
  const response = await approveAll(formData);
  expect(response).toBeUndefined();

  const events = await findTrackingEvents();
  expect(events).toEqual([]);
});

test("returns not found if user is not logged in", async () => {
  const { language } = await languageFactory.build();

  const { phrases } = await phraseFactory.buildMany({
    scope: 3,
    languageId: language.id,
  });

  const formData = new FormData();
  formData.set("verseId", "123");
  formData.set("code", language.code);
  formData.set(`phrases[0][id]`, String(phrases[0].phrase.id));
  formData.set(`phrases[0][gloss]`, faker.lorem.word());
  formData.set(`phrases[1][id]`, String(phrases[1].phrase.id));
  formData.set(`phrases[1][gloss]`, faker.lorem.word());
  formData.set(`phrases[2][id]`, String(phrases[2].phrase.id));
  formData.set(`phrases[2][gloss]`, faker.lorem.word());
  await expect(approveAll(formData)).toBeNextjsNotFound();

  const updatedGloss1 = await findGlossForPhrase(phrases[0].phrase.id);
  expect(updatedGloss1).toBeUndefined();
  const updatedGloss2 = await findGlossForPhrase(phrases[1].phrase.id);
  expect(updatedGloss2).toBeUndefined();
  const updatedGloss3 = await findGlossForPhrase(phrases[2].phrase.id);
  expect(updatedGloss3).toBeUndefined();

  const events = await findTrackingEvents();
  expect(events).toEqual([]);
});

test("returns not found if user is not a translator on the language", async () => {
  const { language } = await languageFactory.build();
  const { user: nonmember } = await userFactory.build();
  await logIn(nonmember.id);

  const { phrases } = await phraseFactory.buildMany({
    scope: 3,
    languageId: language.id,
  });

  const formData = new FormData();
  formData.set("verseId", "123");
  formData.set("code", language.code);
  formData.set(`phrases[0][id]`, String(phrases[0].phrase.id));
  formData.set(`phrases[0][gloss]`, faker.lorem.word());
  formData.set(`phrases[1][id]`, String(phrases[1].phrase.id));
  formData.set(`phrases[1][gloss]`, faker.lorem.word());
  formData.set(`phrases[2][id]`, String(phrases[2].phrase.id));
  formData.set(`phrases[2][gloss]`, faker.lorem.word());
  await expect(approveAll(formData)).toBeNextjsNotFound();

  const updatedGloss1 = await findGlossForPhrase(phrases[0].phrase.id);
  expect(updatedGloss1).toBeUndefined();
  const updatedGloss2 = await findGlossForPhrase(phrases[1].phrase.id);
  expect(updatedGloss2).toBeUndefined();
  const updatedGloss3 = await findGlossForPhrase(phrases[2].phrase.id);
  expect(updatedGloss3).toBeUndefined();

  const events = await findTrackingEvents();
  expect(events).toEqual([]);
});

test("updates found phrases and skips missing phrase IDs", async () => {
  const { language, members } = await languageFactory.build();
  const translatorId = members[0].user_id;
  await logIn(translatorId);

  const { phrases } = await phraseFactory.buildMany({
    scope: 2,
    languageId: language.id,
  });
  const missingPhraseId = 9999999;
  const glosses = [faker.lorem.word(), faker.lorem.word(), faker.lorem.word()];

  const formData = new FormData();
  formData.set("verseId", "123");
  formData.set("code", language.code);
  formData.set(`phrases[0][id]`, String(phrases[0].phrase.id));
  formData.set(`phrases[0][gloss]`, glosses[0]);
  formData.set(`phrases[1][id]`, String(phrases[1].phrase.id));
  formData.set(`phrases[1][gloss]`, glosses[1]);
  formData.set(`phrases[2][id]`, String(missingPhraseId));
  formData.set(`phrases[2][gloss]`, glosses[2]);
  const result = await approveAll(formData);
  expect(result).toBeUndefined();

  const updatedGloss1 = await findGlossForPhrase(phrases[0].phrase.id);
  expect(updatedGloss1).toEqual({
    phrase_id: phrases[0].phrase.id,
    gloss: glosses[0],
    state: GlossStateRaw.Approved,
    updated_at: expect.toBeNow(),
    updated_by: translatorId,
    source: GlossSourceRaw.User,
  });
  const updatedGloss2 = await findGlossForPhrase(phrases[1].phrase.id);
  expect(updatedGloss2).toEqual({
    phrase_id: phrases[1].phrase.id,
    gloss: glosses[1],
    state: GlossStateRaw.Approved,
    updated_at: expect.toBeNow(),
    updated_by: translatorId,
    source: GlossSourceRaw.User,
  });
  const updatedGloss3 = await findGlossForPhrase(missingPhraseId);
  expect(updatedGloss3).toBeUndefined();

  const events = await findTrackingEvents();
  expect(events).toEqual([]);
});

test("updates found phrases and skips phrases belonging to a different language", async () => {
  const { user: translator } = await userFactory.build();
  const { language } = await languageFactory.build({
    members: [translator.id],
  });
  const { language: otherLanguage } = await languageFactory.build({
    members: [translator.id],
  });
  await logIn(translator.id);

  const { phrase } = await phraseFactory.build({
    languageId: language.id,
  });
  const { phrase: phraseInOtherLanguage } = await phraseFactory.build({
    languageId: otherLanguage.id,
  });
  const glosses = [faker.lorem.word(), faker.lorem.word()];

  const formData = new FormData();
  formData.set("verseId", "123");
  formData.set("code", language.code);
  formData.set(`phrases[0][id]`, String(phrase.id));
  formData.set(`phrases[0][gloss]`, glosses[0]);
  formData.set(`phrases[1][id]`, String(phraseInOtherLanguage.id));
  formData.set(`phrases[1][gloss]`, glosses[1]);
  const result = await approveAll(formData);
  expect(result).toBeUndefined();

  const updatedGloss1 = await findGlossForPhrase(phrase.id);
  expect(updatedGloss1).toEqual({
    phrase_id: phrase.id,
    gloss: glosses[0],
    state: GlossStateRaw.Approved,
    updated_at: expect.toBeNow(),
    updated_by: translator.id,
    source: GlossSourceRaw.User,
  });
  const updatedGloss2 = await findGlossForPhrase(phraseInOtherLanguage.id);
  expect(updatedGloss2).toBeUndefined();

  const events = await findTrackingEvents();
  expect(events).toEqual([]);
});

test("creates a new glosses and updates existing glosses for each phrase", async () => {
  const { language, members } = await languageFactory.build();
  const translatorId = members[0].user_id;
  await logIn(translatorId);

  const { phrases } = await phraseFactory.buildMany({
    scope: 3,
    languageId: language.id,
    gloss: ["approved", "unapproved", null],
  });
  const gloss1 = phrases[0].gloss!;
  const gloss2 = phrases[1].gloss!;

  const updatedGlosses = [
    faker.lorem.word(),
    faker.lorem.word(),
    faker.lorem.word(),
  ];

  const formData = new FormData();
  formData.set("verseId", "123");
  formData.set("code", language.code);
  formData.set(`phrases[0][id]`, String(phrases[0].phrase.id));
  formData.set(`phrases[0][gloss]`, updatedGlosses[0]);
  formData.set(`phrases[0][method]`, GlossApprovalMethodRaw.UserInput);
  formData.set(`phrases[1][id]`, String(phrases[1].phrase.id));
  formData.set(`phrases[1][gloss]`, updatedGlosses[1]);
  formData.set(`phrases[1][method]`, GlossApprovalMethodRaw.GoogleSuggestion);
  formData.set(`phrases[2][id]`, String(phrases[2].phrase.id));
  formData.set(`phrases[2][gloss]`, updatedGlosses[2]);
  formData.set(`phrases[2][method]`, GlossApprovalMethodRaw.MachineSuggestion);
  const result = await approveAll(formData);
  expect(result).toBeUndefined();

  const updatedGloss1 = await findGlossForPhrase(phrases[0].phrase.id);
  expect(updatedGloss1).toEqual({
    phrase_id: phrases[0].phrase.id,
    gloss: updatedGlosses[0],
    state: GlossStateRaw.Approved,
    updated_at: expect.toBeNow(),
    updated_by: translatorId,
    source: GlossSourceRaw.User,
  });
  const updatedGloss1History = await findGlossHistoryForPhrase(
    phrases[0].phrase.id,
  );
  expect(updatedGloss1History).toEqual([
    {
      id: expect.any(Number),
      ...gloss1,
    },
  ]);

  const updatedGloss2 = await findGlossForPhrase(phrases[1].phrase.id);
  expect(updatedGloss2).toEqual({
    phrase_id: phrases[1].phrase.id,
    gloss: updatedGlosses[1],
    state: GlossStateRaw.Approved,
    updated_at: expect.toBeNow(),
    updated_by: translatorId,
    source: GlossSourceRaw.User,
  });
  const updatedGloss2History = await findGlossHistoryForPhrase(
    phrases[1].phrase.id,
  );
  expect(updatedGloss2History).toEqual([
    {
      id: expect.any(Number),
      ...gloss2,
    },
  ]);

  const updatedGloss3 = await findGlossForPhrase(phrases[2].phrase.id);
  expect(updatedGloss3).toEqual({
    phrase_id: phrases[2].phrase.id,
    gloss: updatedGlosses[2],
    state: GlossStateRaw.Approved,
    updated_at: expect.toBeNow(),
    updated_by: translatorId,
    source: GlossSourceRaw.User,
  });
  const updatedGloss3History = await findGlossHistoryForPhrase(
    phrases[2].phrase.id,
  );
  expect(updatedGloss3History).toEqual([]);

  const events = await findTrackingEvents();
  expect(events).toEqual([
    {
      id: expect.toBeUlid(),
      type: "approved_gloss",
      data: {
        phraseId: phrases[1].phrase.id,
        method: GlossApprovalMethodRaw.GoogleSuggestion,
      },
      user_id: translatorId,
      language_id: language.id,
      created_at: expect.toBeNow(),
    },
    {
      id: expect.toBeUlid(),
      type: "approved_gloss",
      data: {
        phraseId: phrases[2].phrase.id,
        method: GlossApprovalMethodRaw.MachineSuggestion,
      },
      user_id: translatorId,
      language_id: language.id,
      created_at: expect.toBeNow(),
    },
  ]);

  const glossEvents0 = await findGlossEventsForPhrase(phrases[0].phrase.id);
  expect(glossEvents0).toEqual([
    {
      id: expect.toBeUlid(),
      phrase_id: phrases[0].phrase.id,
      language_id: language.id,
      user_id: translatorId,
      word_ids: [phrases[0].word.id],
      timestamp: expect.toBeNow(),
      prev_gloss: gloss1.gloss ?? "",
      prev_state: gloss1.state,
      new_gloss: updatedGlosses[0],
      new_state: GlossStateRaw.Approved,
      approval_method: null,
    },
  ]);

  const glossEvents1 = await findGlossEventsForPhrase(phrases[1].phrase.id);
  expect(glossEvents1).toEqual([
    {
      id: expect.toBeUlid(),
      phrase_id: phrases[1].phrase.id,
      language_id: language.id,
      user_id: translatorId,
      word_ids: [phrases[1].word.id],
      timestamp: expect.toBeNow(),
      prev_gloss: gloss2.gloss ?? "",
      prev_state: gloss2.state,
      new_gloss: updatedGlosses[1],
      new_state: GlossStateRaw.Approved,
      approval_method: GlossApprovalMethodRaw.GoogleSuggestion,
    },
  ]);

  const glossEvents2 = await findGlossEventsForPhrase(phrases[2].phrase.id);
  expect(glossEvents2).toEqual([
    {
      id: expect.toBeUlid(),
      phrase_id: phrases[2].phrase.id,
      language_id: language.id,
      user_id: translatorId,
      word_ids: [phrases[2].word.id],
      timestamp: expect.toBeNow(),
      prev_gloss: "",
      prev_state: GlossStateRaw.Unapproved,
      new_gloss: updatedGlosses[2],
      new_state: GlossStateRaw.Approved,
      approval_method: GlossApprovalMethodRaw.MachineSuggestion,
    },
  ]);

  // TODO: verify cache validation
});
