import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { test, expect } from "vitest";
import { runServerFn } from "@/tests/vitest/serverFnHarness";
import { updateGlossAction } from "./updateGloss";
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
  const { user, session } = await userFactory.build({ session: true });
  const { language } = await languageFactory.build({ members: [user.id] });

  await expect(
    runServerFn(updateGlossAction, {
      data: {
        languageCode: language.code,
      },
      sessionId: session!.id,
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`
    [ZodError: [
      {
        "code": "invalid_type",
        "expected": "number",
        "received": "nan",
        "path": [
          "phraseId"
        ],
        "message": "Expected number, received nan"
      }
    ]]
  `);

  const events = await findTrackingEvents();
  expect(events).toEqual([]);
});

test("returns unauthorized error if user is not a language member", async () => {
  const { session } = await userFactory.build({ session: true });
  const { language } = await languageFactory.build();

  await expect(
    runServerFn(updateGlossAction, {
      data: {
        languageCode: language.code,
        phraseId: 1,
        gloss: "asdf",
        state: GlossStateRaw.Approved,
      },
      sessionId: session!.id,
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: UnauthorizedError]`);
});

test("returns not found if user is not logged in", async () => {
  const { language } = await languageFactory.build();

  const { phrase } = await phraseFactory.build({
    languageId: language.id,
  });

  await expect(
    runServerFn(updateGlossAction, {
      data: {
        languageCode: language.code,
        phraseId: phrase.id,
        gloss: "asdf",
        state: GlossStateRaw.Approved,
      },
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: UnauthorizedError]`);

  const gloss = await findGlossForPhrase(phrase.id);
  expect(gloss).toBeUndefined();

  const glossEvents = await findGlossEventsForPhrase(phrase.id);
  expect(glossEvents).toEqual([]);

  const events = await findTrackingEvents();
  expect(events).toEqual([]);
});

test("returns not found if user is not a translator on the language", async () => {
  const { language } = await languageFactory.build();
  const { session } = await userFactory.build({ session: true });

  const { phrase } = await phraseFactory.build({
    languageId: language.id,
  });

  await expect(
    runServerFn(updateGlossAction, {
      data: {
        languageCode: language.code,
        phraseId: phrase.id,
        gloss: "asdf",
        state: GlossStateRaw.Approved,
      },
      sessionId: session!.id,
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: UnauthorizedError]`);

  const gloss = await findGlossForPhrase(phrase.id);
  expect(gloss).toBeUndefined();

  const glossEvents = await findGlossEventsForPhrase(phrase.id);
  expect(glossEvents).toEqual([]);

  const events = await findTrackingEvents();
  expect(events).toEqual([]);
});

test("returns not found if the phrase does not exist", async () => {
  const { user, session } = await userFactory.build({ session: true });
  const { language } = await languageFactory.build({ members: [user.id] });

  await expect(
    runServerFn(updateGlossAction, {
      data: {
        languageCode: language.code,
        phraseId: 123456,
        gloss: "asdf",
        state: GlossStateRaw.Approved,
      },
      sessionId: session!.id,
    }),
  ).toBeTanstackNotFound();

  const gloss = await findGlossForPhrase(123456);
  expect(gloss).toBeUndefined();

  const glossEvents = await findGlossEventsForPhrase(123456);
  expect(glossEvents).toEqual([]);

  const events = await findTrackingEvents();
  expect(events).toEqual([]);
});

test("returns not found if the phrase is in a different language", async () => {
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

  await expect(
    runServerFn(updateGlossAction, {
      data: {
        languageCode: otherLanguage.code,
        phraseId: phrase.id,
        gloss: "asdf",
        state: GlossStateRaw.Approved,
      },
      sessionId: session!.id,
    }),
  ).toBeTanstackNotFound();

  const gloss = await findGlossForPhrase(phrase.id);
  expect(gloss).toBeUndefined();

  const glossEvents = await findGlossEventsForPhrase(phrase.id);
  expect(glossEvents).toEqual([]);

  const events = await findTrackingEvents();
  expect(events).toEqual([]);
});

test("creates a new gloss for the phrase", async () => {
  const { user, session } = await userFactory.build({ session: true });
  const { language } = await languageFactory.build({ members: [user.id] });
  const translatorId = user.id;

  const { phrase, words } = await phraseFactory.build({
    languageId: language.id,
  });

  const { response } = await runServerFn(updateGlossAction, {
    data: {
      languageCode: language.code,
      phraseId: phrase.id,
      gloss: "asdf",
      state: GlossStateRaw.Approved,
    },
    sessionId: session!.id,
  });
  expect(response.status).toEqual(204);

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
});

test("creates a new gloss for the phrase and tracks approval", async () => {
  const { user, session } = await userFactory.build({ session: true });
  const { language } = await languageFactory.build({ members: [user.id] });
  const translatorId = user.id;

  const { phrase, words } = await phraseFactory.build({
    languageId: language.id,
  });

  const { response } = await runServerFn(updateGlossAction, {
    data: {
      languageCode: language.code,
      phraseId: phrase.id,
      gloss: "asdf",
      state: GlossStateRaw.Approved,
      method: GlossApprovalMethodRaw.MachineSuggestion,
    },
    sessionId: session!.id,
  });
  expect(response.status).toEqual(204);

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
});

test("updates an existing gloss for the phrase", async () => {
  const { user, session } = await userFactory.build({ session: true });
  const { language } = await languageFactory.build({ members: [user.id] });
  const translatorId = user.id;

  const { phrase, gloss, words } = await phraseFactory.build({
    languageId: language.id,
    gloss: "unapproved",
  });

  const { response } = await runServerFn(updateGlossAction, {
    data: {
      languageCode: language.code,
      phraseId: phrase.id,
      gloss: "asdf",
      state: GlossStateRaw.Approved,
    },
    sessionId: session!.id,
  });
  expect(response.status).toEqual(204);

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
});

test("updates an existing gloss for the phrase and tracks approval", async () => {
  const { user, session } = await userFactory.build({ session: true });
  const { language } = await languageFactory.build({ members: [user.id] });
  const translatorId = user.id;

  const { phrase, gloss, words } = await phraseFactory.build({
    languageId: language.id,
    gloss: "unapproved",
  });

  const { response } = await runServerFn(updateGlossAction, {
    data: {
      languageCode: language.code,
      phraseId: phrase.id,
      gloss: "asdf",
      state: GlossStateRaw.Approved,
      method: GlossApprovalMethodRaw.GoogleSuggestion,
    },
    sessionId: session!.id,
  });
  expect(response.status).toEqual(204);

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
});
