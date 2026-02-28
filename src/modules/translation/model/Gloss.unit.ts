import { describe, test, expect } from "vitest";
import Gloss, { GlossProps } from "./Gloss";
import Phrase, { PhraseProps } from "./Phrase";
import {
  GlossApprovalMethodRaw,
  GlossSourceRaw,
  GlossStateRaw,
} from "../types";

const phrase = new Phrase({
  id: 1,
  languageId: "lang-id",
  wordIds: ["word-1", "word-2"],
  createdAt: new Date(),
  createdBy: "user-id",
  deletedAt: null,
  deletedBy: null,
});

function makeGloss(overrides?: Partial<GlossProps>): Gloss {
  return new Gloss({
    phrase,
    gloss: "hello",
    state: GlossStateRaw.Unapproved,
    source: GlossSourceRaw.User,
    updatedAt: new Date(),
    updatedBy: "user-1",
    ...overrides,
  });
}

describe("create", () => {
  test("creates an unapproved gloss", () => {
    const result = Gloss.create({
      phrase,
      gloss: "hello",
      state: GlossStateRaw.Unapproved,
      userId: "user-1",
    });

    expect(result.props).toEqual({
      phrase,
      gloss: "hello",
      state: GlossStateRaw.Unapproved,
      source: GlossSourceRaw.User,
      updatedAt: expect.toBeNow(),
      updatedBy: "user-1",
    });
    expect(result.events).toEqual([]);
  });

  test("creates an approved gloss without an approval method", () => {
    const result = Gloss.create({
      phrase,
      gloss: "hello",
      state: GlossStateRaw.Approved,
      userId: "user-1",
    });

    expect(result.props).toEqual({
      phrase,
      gloss: "hello",
      state: GlossStateRaw.Approved,
      source: GlossSourceRaw.User,
      updatedAt: expect.toBeNow(),
      updatedBy: "user-1",
    });
    expect(result.events).toEqual([]);
  });

  test("creates an approved gloss with an approval method", () => {
    const result = Gloss.create({
      phrase,
      gloss: "hello",
      state: GlossStateRaw.Approved,
      userId: "user-1",
      approvalMethod: GlossApprovalMethodRaw.MachineSuggestion,
    });

    expect(result.props).toEqual({
      phrase,
      gloss: "hello",
      state: GlossStateRaw.Approved,
      source: GlossSourceRaw.User,
      updatedAt: expect.toBeNow(),
      updatedBy: "user-1",
    });
    expect(result.events).toEqual([
      {
        id: expect.toBeUlid(),
        type: "approved_gloss",
        createdAt: expect.toBeNow(),
        languageId: phrase.languageId,
        userId: "user-1",
        phraseId: phrase.id,
        method: GlossApprovalMethodRaw.MachineSuggestion,
      },
    ]);
  });
});

describe("update", () => {
  test("edits an unapproved gloss", () => {
    const gloss = makeGloss({ state: GlossStateRaw.Unapproved });

    gloss.update({
      gloss: "world",
      state: GlossStateRaw.Unapproved,
      userId: "user-2",
    });

    expect(gloss.props).toEqual({
      phrase,
      gloss: "world",
      state: GlossStateRaw.Unapproved,
      source: GlossSourceRaw.User,
      updatedAt: expect.toBeNow(),
      updatedBy: "user-2",
    });
    expect(gloss.events).toEqual([]);
  });

  test("approves the gloss without an approval method", () => {
    const gloss = makeGloss({ state: GlossStateRaw.Unapproved });

    gloss.update({
      gloss: gloss.gloss,
      state: GlossStateRaw.Approved,
      userId: "user-2",
    });

    expect(gloss.props).toEqual({
      phrase,
      gloss: "hello",
      state: GlossStateRaw.Approved,
      source: GlossSourceRaw.User,
      updatedAt: expect.toBeNow(),
      updatedBy: "user-2",
    });
    expect(gloss.events).toEqual([]);
  });

  test("approves the gloss with an approval method", () => {
    const gloss = makeGloss({ state: GlossStateRaw.Unapproved });

    gloss.update({
      gloss: gloss.gloss,
      state: GlossStateRaw.Approved,
      userId: "user-2",
      approvalMethod: GlossApprovalMethodRaw.MachineSuggestion,
    });

    expect(gloss.props).toEqual({
      phrase,
      gloss: "hello",
      state: GlossStateRaw.Approved,
      source: GlossSourceRaw.User,
      updatedAt: expect.toBeNow(),
      updatedBy: "user-2",
    });
    expect(gloss.events).toEqual([
      {
        id: expect.toBeUlid(),
        type: "approved_gloss",
        createdAt: expect.toBeNow(),
        languageId: phrase.languageId,
        userId: "user-2",
        phraseId: phrase.id,
        method: GlossApprovalMethodRaw.MachineSuggestion,
      },
    ]);
  });

  test("revokes a gloss", () => {
    const gloss = makeGloss({ state: GlossStateRaw.Approved });

    gloss.update({
      gloss: gloss.gloss,
      state: GlossStateRaw.Unapproved,
      userId: "user-2",
    });

    expect(gloss.props).toEqual({
      phrase,
      gloss: "hello",
      state: GlossStateRaw.Unapproved,
      source: GlossSourceRaw.User,
      updatedAt: expect.toBeNow(),
      updatedBy: "user-2",
    });
    expect(gloss.events).toEqual([]);
  });

  test("edits an approved gloss", () => {
    const gloss = makeGloss({ state: GlossStateRaw.Approved });

    gloss.update({
      gloss: "world",
      state: GlossStateRaw.Approved,
      userId: "user-2",
    });

    expect(gloss.props).toEqual({
      phrase,
      gloss: "world",
      state: GlossStateRaw.Approved,
      source: GlossSourceRaw.User,
      updatedAt: expect.toBeNow(),
      updatedBy: "user-2",
    });
    expect(gloss.events).toEqual([]);
  });
});
