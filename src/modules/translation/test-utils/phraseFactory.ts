import { faker } from "@faker-js/faker/locale/en";
import { getDb } from "@/db";
import { Insertable, Selectable } from "kysely";
import { bibleFactory } from "@/modules/bible-core/test-utils/bibleFactory";
import { languageFactory } from "@/modules/languages/test-utils/languageFactory";
import type {
  LanguageMemberTable,
  LanguageTable,
} from "@/modules/languages/db/schema";
import type { WordTable } from "@/modules/bible-core/db/schema";
import type {
  FootnoteTable,
  GlossTable,
  PhraseTable,
  PhraseWordTable,
  TranslatorNoteTable,
} from "../db/schema";
import { GlossSourceRaw, GlossStateRaw } from "../types";
import { ulid } from "@/shared/ulid";

export type GlossOption =
  | "unapproved"
  | "approved"
  | Partial<Insertable<GlossTable>>;

export type NoteOption = true | Partial<Insertable<TranslatorNoteTable>>;
export type FootnoteOption = true | Partial<Insertable<FootnoteTable>>;

export type PhraseManyScope = number | "verse" | "chapter" | "book";

export interface PhraseFactoryOptions {
  languageId: string;
  wordIds: string[];
  deleted?: boolean;
  gloss?: GlossOption;
  translatorNote?: NoteOption;
  footnote?: FootnoteOption;
}

export interface PhraseManyOptions {
  languageId: string;
  scope: PhraseManyScope;
  gloss?: (GlossOption | null)[];
}

interface PhraseFactoryResult {
  phrase: Selectable<PhraseTable>;
  gloss?: Selectable<GlossTable>;
  translatorNote?: Selectable<TranslatorNoteTable>;
  footnote?: Selectable<FootnoteTable>;
  words: Selectable<WordTable>[];
  language: Selectable<LanguageTable>;
  languageMember: Selectable<LanguageMemberTable>;
}

interface PhraseResult {
  word: Selectable<WordTable>;
  phrase: Selectable<PhraseTable>;
  gloss?: Selectable<GlossTable>;
}

interface PhraseManyResult {
  words: Selectable<WordTable>[];
  phrases: PhraseResult[];
  language: Selectable<LanguageTable>;
  languageMember: Selectable<LanguageMemberTable>;
}

function build(
  options: PhraseFactoryOptions,
): Promise<Omit<PhraseFactoryResult, "words" | "language" | "languageMember">>;
function build(
  options: Omit<PhraseFactoryOptions, "wordIds">,
): Promise<Omit<PhraseFactoryResult, "language" | "languageMember">>;
function build(
  options: Omit<PhraseFactoryOptions, "languageId">,
): Promise<Omit<PhraseFactoryResult, "words">>;
function build(
  options?: Omit<PhraseFactoryOptions, "languageId" | "wordIds">,
): Promise<PhraseFactoryResult>;
async function build(
  options: Partial<PhraseFactoryOptions> = {},
): Promise<Partial<PhraseFactoryOptions>> {
  const db = getDb();

  let language: Selectable<LanguageTable> | undefined;
  let languageMember: Selectable<LanguageMemberTable> | undefined;
  let languageId = options.languageId;
  if (!languageId) {
    const result = await languageFactory.build();
    language = result.language;
    languageMember = result.members[0];
    languageId = language.id;
  }

  let memberUserId = languageMember?.user_id;
  if (!memberUserId) {
    const member = await db
      .selectFrom("language_member")
      .select("user_id")
      .where("language_id", "=", languageId)
      .executeTakeFirstOrThrow();
    memberUserId = member.user_id;
  }

  let words: Selectable<WordTable>[] | undefined;
  let wordIds = options.wordIds;
  if (!wordIds) {
    words = [await bibleFactory.word()];
    wordIds = words.map((w) => w.id);
  }

  const phrase = await db
    .insertInto("phrase")
    .values({
      language_id: languageId,
      created_at: faker.date.recent(),
      created_by: memberUserId,
      deleted_at: options.deleted ? new Date() : null,
      deleted_by: options.deleted ? memberUserId : null,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  const phraseWords = await db
    .insertInto("phrase_word")
    .values(wordIds.map((id) => ({ phrase_id: phrase.id, word_id: id })))
    .returningAll()
    .execute();

  const result: Partial<PhraseFactoryResult> = {
    phrase,
    language,
    languageMember,
    words,
  };

  if (options.gloss) {
    const gloss = await insertGloss(phrase.id, memberUserId, options.gloss);

    await insertGlossEvent({ phrase, phraseWords, gloss });

    result.gloss = gloss;
  }

  if (options.translatorNote) {
    result.translatorNote = await insertTranslatorNote(
      phrase.id,
      memberUserId,
      options.translatorNote,
    );
  }

  if (options.footnote) {
    result.footnote = await insertFootnote(
      phrase.id,
      memberUserId,
      options.footnote,
    );
  }

  return result;
}

function buildMany(
  options: PhraseManyOptions,
): Promise<Omit<PhraseManyResult, "language" | "languageMember">>;
function buildMany(
  options: Omit<PhraseManyOptions, "languageId">,
): Promise<PhraseManyResult>;
async function buildMany(
  options: Partial<PhraseManyOptions>,
): Promise<Partial<PhraseManyResult>> {
  const db = getDb();

  let language: Selectable<LanguageTable> | undefined;
  let languageMember: Selectable<LanguageMemberTable> | undefined;
  let languageId = options.languageId;
  if (!languageId) {
    const result = await languageFactory.build();
    language = result.language;
    languageMember = result.members[0];
    languageId = language.id;
  }

  let memberUserId = languageMember?.user_id;
  if (!memberUserId) {
    const member = await db
      .selectFrom("language_member")
      .select("user_id")
      .where("language_id", "=", languageId)
      .executeTakeFirstOrThrow();
    memberUserId = member.user_id;
  }

  let words: Selectable<WordTable>[];
  const scope = options.scope!;
  if (typeof scope === "number") {
    words = await bibleFactory.words({ count: scope });
  } else if (scope === "verse") {
    words = await bibleFactory.words({ verses: 1 });
  } else {
    words = await bibleFactory.words({ select: scope });
  }

  const phrases: PhraseResult[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    const phrase = await db
      .insertInto("phrase")
      .values({
        language_id: languageId,
        created_at: faker.date.recent(),
        created_by: memberUserId,
        deleted_at: null,
        deleted_by: null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const phraseWords = await db
      .insertInto("phrase_word")
      .values({ phrase_id: phrase.id, word_id: word.id })
      .returningAll()
      .execute();

    const phraseResult: PhraseResult = { word, phrase };

    const glossOption = options.gloss?.[i] ?? null;
    if (glossOption !== null) {
      const gloss = await insertGloss(phrase.id, memberUserId, glossOption);

      await insertGlossEvent({ phrase, phraseWords, gloss });

      phraseResult.gloss = gloss;
    }

    phrases.push(phraseResult);
  }

  return { language, languageMember, words, phrases };
}

export const phraseFactory = {
  build,
  buildMany,
};

async function insertGlossEvent({
  phrase,
  phraseWords,
  gloss,
}: {
  phraseWords: Selectable<PhraseWordTable>[];
  phrase: Selectable<PhraseTable>;
  gloss: Selectable<GlossTable>;
}) {
  await getDb()
    .insertInto("gloss_event")
    .values(
      phraseWords.map((word) => ({
        id: ulid(),
        user_id: gloss.updated_by!,
        language_id: phrase.language_id,
        phrase_id: phrase.id,
        word_id: word.word_id,
        prev_gloss: "",
        prev_state: GlossStateRaw.Unapproved,
        new_gloss: gloss.gloss ?? "",
        new_state: gloss.state,
        timestamp: gloss.updated_at,
      })),
    )
    .execute();
}

async function insertGloss(
  phraseId: number,
  userId: string,
  option: GlossOption,
): Promise<Selectable<GlossTable>> {
  const db = getDb();

  let values: Insertable<GlossTable>;

  if (option === "unapproved") {
    values = {
      phrase_id: phraseId,
      gloss: faker.lorem.word(),
      state: GlossStateRaw.Unapproved,
      updated_at: faker.date.recent(),
      updated_by: userId,
      source: GlossSourceRaw.User,
    };
  } else if (option === "approved") {
    values = {
      phrase_id: phraseId,
      gloss: faker.lorem.word(),
      state: GlossStateRaw.Approved,
      updated_at: faker.date.recent(),
      updated_by: userId,
      source: GlossSourceRaw.User,
    };
  } else {
    values = {
      phrase_id: phraseId,
      gloss: option.gloss ?? faker.lorem.word(),
      state: option.state ?? GlossStateRaw.Unapproved,
      updated_at: option.updated_at ?? faker.date.recent(),
      updated_by: option.updated_by ?? userId,
      source: option.source ?? GlossSourceRaw.User,
    };
  }

  return db
    .insertInto("gloss")
    .values(values)
    .returningAll()
    .executeTakeFirstOrThrow();
}

async function insertTranslatorNote(
  phraseId: number,
  userId: string,
  option: NoteOption,
): Promise<Selectable<TranslatorNoteTable>> {
  const db = getDb();

  const overrides = option === true ? {} : option;
  return db
    .insertInto("translator_note")
    .values({
      phrase_id: phraseId,
      author_id: userId,
      content: `<p>${faker.lorem.words()}</p>`,
      timestamp: faker.date.recent(),
      ...overrides,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

async function insertFootnote(
  phraseId: number,
  userId: string,
  option: FootnoteOption,
): Promise<Selectable<FootnoteTable>> {
  const db = getDb();

  const overrides = option === true ? {} : option;
  return db
    .insertInto("footnote")
    .values({
      phrase_id: phraseId,
      author_id: userId,
      content: `<p>${faker.lorem.words()}</p>`,
      timestamp: faker.date.recent(),
      ...overrides,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}
