import { describe, test, expect } from "vitest";
import Phrase, { PhraseProps } from "./Phrase";
import Gloss from "./Gloss";
import {
  GlossApprovalMethodRaw,
  GlossSourceRaw,
  GlossStateRaw,
} from "../types";

function makePhrase(overrides?: Partial<PhraseProps>): Phrase {
  return new Phrase({
    id: 1,
    languageId: "lang-id",
    wordIds: ["word-1", "word-2"],
    createdAt: new Date(),
    createdBy: "user-id",
    deletedAt: null,
    deletedBy: null,
    gloss: null,
    ...overrides,
  });
}

function makeGloss(
  overrides?: Partial<ConstructorParameters<typeof Gloss>[0]>,
): Gloss {
  return new Gloss({
    gloss: "hello",
    state: GlossStateRaw.Unapproved,
    source: GlossSourceRaw.User,
    updatedAt: new Date(),
    updatedBy: "user-1",
    ...overrides,
  });
}

describe("updateGloss", () => {
  test("creates an unapproved gloss", () => {
    const phrase = makePhrase();

    phrase.updateGloss({
      gloss: "hello",
      state: GlossStateRaw.Unapproved,
      userId: "user-1",
    });

    expect(phrase.gloss?.props).toEqual({
      gloss: "hello",
      state: GlossStateRaw.Unapproved,
      source: GlossSourceRaw.User,
      updatedAt: expect.toBeNow(),
      updatedBy: "user-1",
    });
    expect(phrase.events).toEqual([]);
  });

  test("creates an approved gloss without an approval method", () => {
    const phrase = makePhrase();

    phrase.updateGloss({
      gloss: "hello",
      state: GlossStateRaw.Approved,
      userId: "user-1",
    });

    expect(phrase.gloss?.props).toEqual({
      gloss: "hello",
      state: GlossStateRaw.Approved,
      source: GlossSourceRaw.User,
      updatedAt: expect.toBeNow(),
      updatedBy: "user-1",
    });
    expect(phrase.events).toEqual([]);
  });

  test("creates an approved gloss with an approval method", () => {
    const phrase = makePhrase();

    phrase.updateGloss({
      gloss: "hello",
      state: GlossStateRaw.Approved,
      userId: "user-1",
      approvalMethod: GlossApprovalMethodRaw.MachineSuggestion,
    });

    expect(phrase.gloss?.props).toEqual({
      gloss: "hello",
      state: GlossStateRaw.Approved,
      source: GlossSourceRaw.User,
      updatedAt: expect.toBeNow(),
      updatedBy: "user-1",
    });
    expect(phrase.events).toEqual([
      {
        id: expect.toBeUlid(),
        type: "approved_gloss",
        createdAt: expect.toBeNow(),
        languageId: "lang-id",
        userId: "user-1",
        phraseId: 1,
        method: GlossApprovalMethodRaw.MachineSuggestion,
      },
    ]);
  });

  test("edits an unapproved gloss", () => {
    const phrase = makePhrase({
      gloss: makeGloss({ state: GlossStateRaw.Unapproved }),
    });

    phrase.updateGloss({
      gloss: "world",
      state: GlossStateRaw.Unapproved,
      userId: "user-2",
    });

    expect(phrase.gloss?.props).toEqual({
      gloss: "world",
      state: GlossStateRaw.Unapproved,
      source: GlossSourceRaw.User,
      updatedAt: expect.toBeNow(),
      updatedBy: "user-2",
    });
    expect(phrase.events).toEqual([]);
  });

  test("approves the gloss without an approval method", () => {
    const phrase = makePhrase({
      gloss: makeGloss({ state: GlossStateRaw.Unapproved }),
    });

    phrase.updateGloss({
      gloss: "hello",
      state: GlossStateRaw.Approved,
      userId: "user-2",
    });

    expect(phrase.gloss?.props).toEqual({
      gloss: "hello",
      state: GlossStateRaw.Approved,
      source: GlossSourceRaw.User,
      updatedAt: expect.toBeNow(),
      updatedBy: "user-2",
    });
    expect(phrase.events).toEqual([]);
  });

  test("approves the gloss with an approval method", () => {
    const phrase = makePhrase({
      gloss: makeGloss({ state: GlossStateRaw.Unapproved }),
    });

    phrase.updateGloss({
      gloss: "hello",
      state: GlossStateRaw.Approved,
      userId: "user-2",
      approvalMethod: GlossApprovalMethodRaw.MachineSuggestion,
    });

    expect(phrase.gloss?.props).toEqual({
      gloss: "hello",
      state: GlossStateRaw.Approved,
      source: GlossSourceRaw.User,
      updatedAt: expect.toBeNow(),
      updatedBy: "user-2",
    });
    expect(phrase.events).toEqual([
      {
        id: expect.toBeUlid(),
        type: "approved_gloss",
        createdAt: expect.toBeNow(),
        languageId: "lang-id",
        userId: "user-2",
        phraseId: 1,
        method: GlossApprovalMethodRaw.MachineSuggestion,
      },
    ]);
  });

  test("revokes a gloss", () => {
    const phrase = makePhrase({
      gloss: makeGloss({ state: GlossStateRaw.Approved }),
    });

    phrase.updateGloss({
      gloss: "hello",
      state: GlossStateRaw.Unapproved,
      userId: "user-2",
    });

    expect(phrase.gloss?.props).toEqual({
      gloss: "hello",
      state: GlossStateRaw.Unapproved,
      source: GlossSourceRaw.User,
      updatedAt: expect.toBeNow(),
      updatedBy: "user-2",
    });
    expect(phrase.events).toEqual([]);
  });

  test("edits an approved gloss", () => {
    const phrase = makePhrase({
      gloss: makeGloss({ state: GlossStateRaw.Approved }),
    });

    phrase.updateGloss({
      gloss: "world",
      state: GlossStateRaw.Approved,
      userId: "user-2",
    });

    expect(phrase.gloss?.props).toEqual({
      gloss: "world",
      state: GlossStateRaw.Approved,
      source: GlossSourceRaw.User,
      updatedAt: expect.toBeNow(),
      updatedBy: "user-2",
    });
    expect(phrase.events).toEqual([]);
  });
});
