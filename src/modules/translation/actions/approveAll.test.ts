import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { test, expect } from "vitest";
import { runServerFn } from "@/tests/vitest/serverFnHarness";
import { approveAll } from "./approveAll";
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
  const { session } = await userFactory.build({ session: true });

  await expect(
    runServerFn(approveAll, {
      data: {},
      sessionId: session!.id,
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: UnauthorizedError]`);

  const events = await findTrackingEvents();
  expect(events).toEqual([]);
});

test("returns unauthorized error if user is not a language member", async () => {
  const { session } = await userFactory.build({ session: true });
  const { language } = await languageFactory.build();

  await expect(
    runServerFn(approveAll, {
      data: {
        code: language.code,
        phrases: [{ id: 1, gloss: "asdf" }],
      },
      sessionId: session!.id,
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: UnauthorizedError]`);
});

test("returns not found if user is not logged in", async () => {
  const { language } = await languageFactory.build();

  const { phrases } = await phraseFactory.buildMany({
    scope: 3,
    languageId: language.id,
  });

  await expect(
    runServerFn(approveAll, {
      data: {
        code: language.code,
        phrases: [
          { id: phrases[0].phrase.id, gloss: faker.lorem.word() },
          { id: phrases[1].phrase.id, gloss: faker.lorem.word() },
          { id: phrases[2].phrase.id, gloss: faker.lorem.word() },
        ],
      },
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: UnauthorizedError]`);

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
  const { session } = await userFactory.build({ session: true });

  const { phrases } = await phraseFactory.buildMany({
    scope: 3,
    languageId: language.id,
  });

  await expect(
    runServerFn(approveAll, {
      data: {
        code: language.code,
        phrases: [
          { id: phrases[0].phrase.id, gloss: faker.lorem.word() },
          { id: phrases[1].phrase.id, gloss: faker.lorem.word() },
          { id: phrases[2].phrase.id, gloss: faker.lorem.word() },
        ],
      },
      sessionId: session!.id,
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: UnauthorizedError]`);

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
  const { user, session } = await userFactory.build({ session: true });
  const { language } = await languageFactory.build({ members: [user.id] });

  const { phrases } = await phraseFactory.buildMany({
    scope: 2,
    languageId: language.id,
  });
  const missingPhraseId = 9999999;
  const glosses = [faker.lorem.word(), faker.lorem.word(), faker.lorem.word()];

  const { response } = await runServerFn(approveAll, {
    data: {
      code: language.code,
      phrases: [
        { id: phrases[0].phrase.id, gloss: glosses[0] },
        { id: phrases[1].phrase.id, gloss: glosses[1] },
        { id: missingPhraseId, gloss: glosses[2] },
      ],
    },
    sessionId: session!.id,
  });
  expect(response.status).toEqual(204);

  const updatedGloss1 = await findGlossForPhrase(phrases[0].phrase.id);
  expect(updatedGloss1).toEqual({
    phrase_id: phrases[0].phrase.id,
    gloss: glosses[0],
    state: GlossStateRaw.Approved,
    updated_at: expect.toBeNow(),
    updated_by: user.id,
    source: GlossSourceRaw.User,
  });
  const updatedGloss2 = await findGlossForPhrase(phrases[1].phrase.id);
  expect(updatedGloss2).toEqual({
    phrase_id: phrases[1].phrase.id,
    gloss: glosses[1],
    state: GlossStateRaw.Approved,
    updated_at: expect.toBeNow(),
    updated_by: user.id,
    source: GlossSourceRaw.User,
  });
  const updatedGloss3 = await findGlossForPhrase(missingPhraseId);
  expect(updatedGloss3).toBeUndefined();

  const events = await findTrackingEvents();
  expect(events).toEqual([]);
});

test("updates found phrases and skips phrases belonging to a different language", async () => {
  const { user: translator, session } = await userFactory.build({
    session: true,
  });
  const { language } = await languageFactory.build({
    members: [translator.id],
  });
  const { language: otherLanguage } = await languageFactory.build({
    members: [translator.id],
  });

  const { phrase } = await phraseFactory.build({
    languageId: language.id,
  });
  const { phrase: phraseInOtherLanguage } = await phraseFactory.build({
    languageId: otherLanguage.id,
  });
  const glosses = [faker.lorem.word(), faker.lorem.word()];

  const { response } = await runServerFn(approveAll, {
    data: {
      code: language.code,
      phrases: [
        { id: phrase.id, gloss: glosses[0] },
        { id: phraseInOtherLanguage.id, gloss: glosses[1] },
      ],
    },
    sessionId: session!.id,
  });
  expect(response.status).toEqual(204);

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
  const { user, session } = await userFactory.build({ session: true });
  const { language } = await languageFactory.build({ members: [user.id] });

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

  const { response } = await runServerFn(approveAll, {
    data: {
      code: language.code,
      phrases: [
        {
          id: phrases[0].phrase.id,
          gloss: updatedGlosses[0],
          method: GlossApprovalMethodRaw.UserInput,
        },
        {
          id: phrases[1].phrase.id,
          gloss: updatedGlosses[1],
          method: GlossApprovalMethodRaw.GoogleSuggestion,
        },
        {
          id: phrases[2].phrase.id,
          gloss: updatedGlosses[2],
          method: GlossApprovalMethodRaw.MachineSuggestion,
        },
      ],
    },
    sessionId: session!.id,
  });
  expect(response.status).toEqual(204);

  const updatedGloss1 = await findGlossForPhrase(phrases[0].phrase.id);
  expect(updatedGloss1).toEqual({
    phrase_id: phrases[0].phrase.id,
    gloss: updatedGlosses[0],
    state: GlossStateRaw.Approved,
    updated_at: expect.toBeNow(),
    updated_by: user.id,
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
    updated_by: user.id,
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
    updated_by: user.id,
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
      user_id: user.id,
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
      user_id: user.id,
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
      user_id: user.id,
      word_id: phrases[0].word.id,
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
      user_id: user.id,
      word_id: phrases[1].word.id,
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
      user_id: user.id,
      word_id: phrases[2].word.id,
      timestamp: expect.toBeNow(),
      prev_gloss: "",
      prev_state: GlossStateRaw.Unapproved,
      new_gloss: updatedGlosses[2],
      new_state: GlossStateRaw.Approved,
      approval_method: GlossApprovalMethodRaw.MachineSuggestion,
    },
  ]);
});
