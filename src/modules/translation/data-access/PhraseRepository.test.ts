import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { test, expect } from "vitest";
import phraseRepository from "./PhraseRepository";
import { phraseFactory } from "../test-utils/phraseFactory";
import { languageFactory } from "@/modules/languages/test-utils/languageFactory";
import Gloss from "../model/Gloss";
import PhraseModel from "../model/Phrase";

initializeDatabase();

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
