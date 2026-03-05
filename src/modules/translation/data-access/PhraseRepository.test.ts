import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { test, expect, describe, vitest } from "vitest";
import phraseRepository from "./PhraseRepository";
import { phraseFactory } from "../test-utils/phraseFactory";
import { languageFactory } from "@/modules/languages/test-utils/languageFactory";
import { bibleFactory } from "@/modules/bible-core/test-utils/bibleFactory";
import Gloss from "../model/Gloss";
import PhraseModel from "../model/Phrase";
import {
  GlossApprovalMethodRaw,
  GlossSourceRaw,
  GlossStateRaw,
} from "../types";
import { trackingClient } from "@/modules/reporting";
import {
  findGlossForPhrase,
  findPhraseById,
  findPhraseWordsForPhrase,
} from "../test-utils/dbUtils";
import { kyselyTransaction } from "@/db";

vitest.mock("@/modules/reporting");

initializeDatabase();

describe("findWithinLanguage", () => {
  test("returns undefined when phrase ID does not exist", async () => {
    const { language } = await languageFactory.build();

    const result = await phraseRepository.findWithinLanguage({
      languageId: language.id,
      phraseId: 1,
    });

    expect(result).toBeUndefined();
  });

  test("returns undefined when language ID does not exist", async () => {
    const result = await phraseRepository.findWithinLanguage({
      languageId: "00000000-0000-0000-0000-000000000000",
      phraseId: 1,
    });

    expect(result).toBeUndefined();
  });

  test("returns undefined when phrase belongs to a different language", async () => {
    const { language: otherLanguage } = await languageFactory.build();
    const { phrase } = await phraseFactory.build({});

    const result = await phraseRepository.findWithinLanguage({
      languageId: otherLanguage.id,
      phraseId: phrase.id,
    });

    expect(result).toBeUndefined();
  });

  test("returns undefined for a soft-deleted phrase", async () => {
    const { phrase, language } = await phraseFactory.build({ deleted: true });

    const result = await phraseRepository.findWithinLanguage({
      languageId: language!.id,
      phraseId: phrase.id,
    });

    expect(result).toBeUndefined();
  });

  test("returns a PhraseModel with no words and no gloss", async () => {
    const { phrase, language } = await phraseFactory.build({ wordIds: [] });

    const result = await phraseRepository.findWithinLanguage({
      languageId: language.id,
      phraseId: phrase.id,
    });

    expect(result).toEqual(
      new PhraseModel({
        id: phrase.id,
        languageId: phrase.language_id,
        wordIds: [],
        createdAt: phrase.created_at,
        createdBy: phrase.created_by,
        deletedAt: phrase.deleted_at,
        deletedBy: phrase.deleted_by,
        gloss: null,
      }),
    );
  });

  test("returns a PhraseModel with associated word IDs", async () => {
    const { phrase, language, words } = await phraseFactory.build({});

    const result = await phraseRepository.findWithinLanguage({
      languageId: language.id,
      phraseId: phrase.id,
    });

    expect(result).toEqual(
      new PhraseModel({
        id: phrase.id,
        languageId: phrase.language_id,
        wordIds: words.map((w) => w.id),
        createdAt: phrase.created_at,
        createdBy: phrase.created_by,
        deletedAt: phrase.deleted_at,
        deletedBy: phrase.deleted_by,
        gloss: null,
      }),
    );
  });

  test("returns a PhraseModel with a hydrated gloss", async () => {
    const { phrase, language, gloss, words } = await phraseFactory.build({
      gloss: "approved",
    });

    const result = await phraseRepository.findWithinLanguage({
      languageId: language.id,
      phraseId: phrase.id,
    });

    expect(result).toEqual(
      new PhraseModel({
        id: phrase.id,
        languageId: phrase.language_id,
        wordIds: words.map((w) => w.id),
        createdAt: phrase.created_at,
        createdBy: phrase.created_by,
        deletedAt: phrase.deleted_at,
        deletedBy: phrase.deleted_by,
        gloss: new Gloss({
          gloss: gloss!.gloss,
          state: gloss!.state,
          source: gloss!.source,
          updatedAt: gloss!.updated_at,
          updatedBy: gloss!.updated_by,
        }),
      }),
    );
  });

  test("uses the provided transaction to read uncommitted data", async () => {
    const { language } = await languageFactory.build();

    await kyselyTransaction(async (trx) => {
      const { id: phraseId } = await trx
        .insertInto("phrase")
        .values({
          language_id: language.id,
          created_at: new Date(),
          created_by: null,
          deleted_at: null,
          deleted_by: null,
        })
        .returning("id")
        .executeTakeFirstOrThrow();

      // The row is not yet committed, so a query outside the transaction
      // would return undefined. Passing trx lets findWithinLanguage see it.
      const result = await phraseRepository.findWithinLanguage({
        languageId: language.id,
        phraseId,
        trx,
      });

      expect(result).toBeDefined();
      expect(result!.props.id).toBe(phraseId);
    });
  });
});

describe("commit", () => {
  test("creates a new phrase without a gloss", async () => {
    const { language, members } = await languageFactory.build();
    const memberId = members[0].user_id;
    const word = await bibleFactory.word();
    const createdAt = new Date();

    const phrase = new PhraseModel({
      id: 0,
      languageId: language.id,
      wordIds: [word.id],
      createdAt,
      createdBy: memberId,
      deletedAt: null,
      deletedBy: null,
      gloss: null,
    });

    await phraseRepository.commit(phrase);

    expect(phrase.props.id).toBeGreaterThan(0);

    const phraseRow = await findPhraseById(phrase.props.id);
    expect(phraseRow).toEqual({
      id: phrase.props.id,
      language_id: language.id,
      created_at: createdAt,
      created_by: memberId,
      deleted_at: null,
      deleted_by: null,
    });

    const phraseWordRows = await findPhraseWordsForPhrase(phrase.props.id);
    expect(phraseWordRows).toEqual([
      { phrase_id: phrase.props.id, word_id: word.id },
    ]);

    const gloss = await findGlossForPhrase(phrase.props.id);
    expect(gloss).toBeUndefined();

    expect(trackingClient.trackMany).not.toHaveBeenCalled();
  });

  test("creates a new phrase with multiple words", async () => {
    const { language, members } = await languageFactory.build();
    const memberId = members[0].user_id;
    const words = await bibleFactory.words({ count: 2 });
    const createdAt = new Date();

    const phrase = new PhraseModel({
      id: 0,
      languageId: language.id,
      wordIds: words.map((w) => w.id),
      createdAt,
      createdBy: memberId,
      deletedAt: null,
      deletedBy: null,
      gloss: null,
    });

    await phraseRepository.commit(phrase);

    expect(phrase.props.id).toBeGreaterThan(0);

    const phraseRow = await findPhraseById(phrase.props.id);
    expect(phraseRow).toEqual({
      id: phrase.props.id,
      language_id: language.id,
      created_at: createdAt,
      created_by: memberId,
      deleted_at: null,
      deleted_by: null,
    });

    const phraseWordRows = await findPhraseWordsForPhrase(phrase.props.id);
    expect(phraseWordRows).toEqual(
      words.map((w) => ({ phrase_id: phrase.props.id, word_id: w.id })),
    );

    const gloss = await findGlossForPhrase(phrase.props.id);
    expect(gloss).toBeUndefined();

    expect(trackingClient.trackMany).not.toHaveBeenCalled();
  });

  test("creates a new phrase with a gloss and no events", async () => {
    const { language, members } = await languageFactory.build();
    const memberId = members[0].user_id;
    const word = await bibleFactory.word();
    const createdAt = new Date();
    const glossUpdatedAt = new Date();

    const phrase = new PhraseModel({
      id: 0,
      languageId: language.id,
      wordIds: [word.id],
      createdAt,
      createdBy: memberId,
      deletedAt: null,
      deletedBy: null,
      gloss: new Gloss({
        gloss: "the beginning",
        state: GlossStateRaw.Unapproved,
        source: GlossSourceRaw.User,
        updatedAt: glossUpdatedAt,
        updatedBy: memberId,
      }),
    });

    await phraseRepository.commit(phrase);

    expect(phrase.props.id).toBeGreaterThan(0);

    const phraseRow = await findPhraseById(phrase.props.id);
    expect(phraseRow).toEqual({
      id: phrase.props.id,
      language_id: language.id,
      created_at: createdAt,
      created_by: memberId,
      deleted_at: null,
      deleted_by: null,
    });

    const phraseWordRows = await findPhraseWordsForPhrase(phrase.props.id);
    expect(phraseWordRows).toEqual([
      { phrase_id: phrase.props.id, word_id: word.id },
    ]);

    const gloss = await findGlossForPhrase(phrase.props.id);
    expect(gloss).toEqual({
      phrase_id: phrase.props.id,
      gloss: "the beginning",
      state: GlossStateRaw.Unapproved,
      source: GlossSourceRaw.User,
      updated_at: glossUpdatedAt,
      updated_by: memberId,
    });

    expect(trackingClient.trackMany).not.toHaveBeenCalled();
  });

  test("creates a new phrase with a gloss and tracks the approval event", async () => {
    const { language, members } = await languageFactory.build();
    const memberId = members[0].user_id;
    const word = await bibleFactory.word();
    const createdAt = new Date();

    const phrase = new PhraseModel({
      id: 0,
      languageId: language.id,
      wordIds: [word.id],
      createdAt,
      createdBy: memberId,
      deletedAt: null,
      deletedBy: null,
      gloss: null,
    });

    phrase.updateGloss({
      gloss: "in the beginning",
      state: GlossStateRaw.Approved,
      userId: memberId,
      approvalMethod: GlossApprovalMethodRaw.UserInput,
    });

    await phraseRepository.commit(phrase);

    expect(phrase.props.id).toBeGreaterThan(0);

    const phraseRow = await findPhraseById(phrase.props.id);
    expect(phraseRow).toEqual({
      id: phrase.props.id,
      language_id: language.id,
      created_at: createdAt,
      created_by: memberId,
      deleted_at: null,
      deleted_by: null,
    });

    const phraseWordRows = await findPhraseWordsForPhrase(phrase.props.id);
    expect(phraseWordRows).toEqual([
      { phrase_id: phrase.props.id, word_id: word.id },
    ]);

    const gloss = await findGlossForPhrase(phrase.props.id);
    expect(gloss).toEqual({
      phrase_id: phrase.props.id,
      gloss: "in the beginning",
      state: GlossStateRaw.Approved,
      source: GlossSourceRaw.User,
      updated_at: phrase.props.gloss!.props.updatedAt,
      updated_by: memberId,
    });

    expect(trackingClient.trackMany).toHaveBeenCalledExactlyOnceWith(
      [
        expect.objectContaining({
          type: "approved_gloss",
          languageId: language.id,
          userId: memberId,
          phraseId: phrase.props.id,
          method: GlossApprovalMethodRaw.UserInput,
        }),
      ],
      expect.anything(),
    );
  });

  test("soft-deletes an existing phrase", async () => {
    const { phrase, words } = await phraseFactory.build({});

    const deletedAt = new Date();
    const model = new PhraseModel({
      id: phrase.id,
      languageId: phrase.language_id,
      wordIds: words.map((w) => w.id),
      createdAt: phrase.created_at,
      createdBy: phrase.created_by,
      deletedAt,
      deletedBy: phrase.created_by,
      gloss: null,
    });

    await phraseRepository.commit(model);

    const phraseRow = await findPhraseById(phrase.id);
    expect(phraseRow).toEqual({
      ...phrase,
      deleted_at: deletedAt,
      deleted_by: phrase.created_by,
    });

    const phraseWordRows = await findPhraseWordsForPhrase(phrase.id);
    expect(phraseWordRows).toEqual([
      { phrase_id: phrase.id, word_id: words[0].id },
    ]);

    const gloss = await findGlossForPhrase(phrase.id);
    expect(gloss).toBeUndefined();

    expect(trackingClient.trackMany).not.toHaveBeenCalled();
  });

  test("updates gloss on an existing phrase without an approval event", async () => {
    const { phrase, language, languageMember, words, gloss } =
      await phraseFactory.build({ gloss: "unapproved" });

    const model = await phraseRepository.findWithinLanguage({
      languageId: language.id,
      phraseId: phrase.id,
    });

    model!.updateGloss({
      gloss: "updated gloss",
      state: GlossStateRaw.Unapproved,
      userId: languageMember.user_id,
    });

    await phraseRepository.commit(model!);

    const phraseRow = await findPhraseById(phrase.id);
    expect(phraseRow).toEqual(phrase);

    const phraseWordRows = await findPhraseWordsForPhrase(phrase.id);
    expect(phraseWordRows).toEqual([
      { phrase_id: phrase.id, word_id: words[0].id },
    ]);

    const updatedGloss = await findGlossForPhrase(phrase.id);
    expect(updatedGloss).toEqual({
      ...gloss,
      gloss: "updated gloss",
      updated_at: model!.props.gloss!.props.updatedAt,
      updated_by: languageMember.user_id,
    });

    expect(trackingClient.trackMany).not.toHaveBeenCalled();
  });

  test("updates gloss on an existing phrase and tracks the approval event", async () => {
    const { phrase, language, languageMember, words, gloss } =
      await phraseFactory.build({ gloss: "unapproved" });

    const model = await phraseRepository.findWithinLanguage({
      languageId: language.id,
      phraseId: phrase.id,
    });

    model!.updateGloss({
      gloss: "approved gloss",
      state: GlossStateRaw.Approved,
      userId: languageMember.user_id,
      approvalMethod: GlossApprovalMethodRaw.MachineSuggestion,
    });

    await phraseRepository.commit(model!);

    const phraseRow = await findPhraseById(phrase.id);
    expect(phraseRow).toEqual(phrase);

    const phraseWordRows = await findPhraseWordsForPhrase(phrase.id);
    expect(phraseWordRows).toEqual([
      { phrase_id: phrase.id, word_id: words[0].id },
    ]);

    const updatedGloss = await findGlossForPhrase(phrase.id);
    expect(updatedGloss).toEqual({
      ...gloss,
      gloss: "approved gloss",
      state: GlossStateRaw.Approved,
      updated_at: model!.props.gloss!.props.updatedAt,
      updated_by: languageMember.user_id,
    });

    expect(trackingClient.trackMany).toHaveBeenCalledExactlyOnceWith(
      [
        expect.objectContaining({
          type: "approved_gloss",
          languageId: language.id,
          userId: languageMember.user_id,
          phraseId: phrase.id,
          method: GlossApprovalMethodRaw.MachineSuggestion,
        }),
      ],
      expect.anything(),
    );
  });

  test("does not update gloss when nothing has changed", async () => {
    const { phrase, language, gloss, words } = await phraseFactory.build({
      gloss: "approved",
    });

    const model = await phraseRepository.findWithinLanguage({
      languageId: language.id,
      phraseId: phrase.id,
    });

    await phraseRepository.commit(model!);

    const phraseRow = await findPhraseById(phrase.id);
    expect(phraseRow).toEqual(phrase);

    const phraseWordRows = await findPhraseWordsForPhrase(phrase.id);
    expect(phraseWordRows).toEqual([
      { phrase_id: phrase.id, word_id: words[0].id },
    ]);

    const unchangedGloss = await findGlossForPhrase(phrase.id);
    expect(unchangedGloss).toEqual(gloss);

    expect(trackingClient.trackMany).not.toHaveBeenCalled();
  });

  test("uses the provided transaction and writes are not visible until committed", async () => {
    const { language, members } = await languageFactory.build();
    const memberId = members[0].user_id;
    const word = await bibleFactory.word();

    const phrase = new PhraseModel({
      id: 0,
      languageId: language.id,
      wordIds: [word.id],
      createdAt: new Date(),
      createdBy: memberId,
      deletedAt: null,
      deletedBy: null,
      gloss: null,
    });

    await kyselyTransaction(async (trx) => {
      await phraseRepository.commit(phrase, trx);

      // Write has been applied within the transaction but not yet committed,
      // so a query outside the transaction cannot see the new phrase row.
      const rowMidTransaction = await findPhraseById(phrase.props.id);
      expect(rowMidTransaction).toBeUndefined();
    });

    // After the transaction commits the row becomes visible.
    const rowAfterCommit = await findPhraseById(phrase.props.id);
    expect(rowAfterCommit).toBeDefined();
  });
});
