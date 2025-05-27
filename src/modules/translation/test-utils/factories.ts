import { Async } from "factory.ts";
import { DbPhrase, DbPhraseWord } from "../data-access/PhraseRepository";
import { query } from "@/db";
import { faker } from "@faker-js/faker/locale/en";
import { DbGloss } from "./dbUtils";
import { GlossStateRaw } from "../types";

export const phraseFactory = Async.makeFactoryWithRequired<
  DbPhrase,
  "languageId"
>({
  id: Async.each((seq) => seq),
  createdAt: Async.each(() => faker.date.recent()),
  createdBy: null,
  deletedAt: null,
  deletedBy: null,
}).transform(async (phrase) => {
  await query(
    `
      insert into phrase (id, created_at, created_by, deleted_at, deleted_by, language_id)
      values ($1, $2, $3, $4, $5, $6)
    `,
    [
      phrase.id,
      phrase.createdAt,
      phrase.createdBy,
      phrase.deletedAt,
      phrase.deletedBy,
      phrase.languageId,
    ],
  );
  return phrase;
});

export const phraseWordFactory = Async.makeFactoryWithRequired<
  DbPhraseWord,
  "phraseId" | "wordId"
>({}).transform(async (phraseWord) => {
  await query(
    `
      insert into phrase_word (phrase_id, word_id)
      values ($1, $2)
    `,
    [phraseWord.phraseId, phraseWord.wordId],
  );
  return phraseWord;
});

export const glossFactory = Async.makeFactoryWithRequired<DbGloss, "phraseId">({
  gloss: Async.each(() => faker.lorem.word()),
  state: Async.each(() => GlossStateRaw.Unapproved),
  updatedAt: Async.each(() => faker.date.recent()),
  updatedBy: null,
  source: null,
}).transform(async (gloss) => {
  await query(
    `
      insert into gloss (phrase_id, gloss, state, updated_at, updated_by, source)
      values ($1, $2, $3, $4, $5, $6)
    `,
    [
      gloss.phraseId,
      gloss.gloss,
      gloss.state,
      gloss.updatedAt,
      gloss.updatedBy,
      gloss.source,
    ],
  );
  return gloss;
});
