import { getDb } from "@/db";
import { Selectable } from "kysely";
import type {
  FootnoteTable,
  GlossEventTable,
  GlossHistoryTable,
  GlossTable,
  PhraseTable,
  PhraseWordTable,
  TranslatorNoteTable,
} from "../db/schema";

export async function findPhraseById(
  id: number,
): Promise<Selectable<PhraseTable> | undefined> {
  return getDb()
    .selectFrom("phrase")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();
}

export async function findPhrasesForLanguage(
  languageId: string,
): Promise<Selectable<PhraseTable>[]> {
  return getDb()
    .selectFrom("phrase")
    .selectAll()
    .where("language_id", "=", languageId)
    .execute();
}

export async function findPhraseWordsForLanguage(
  languageId: string,
): Promise<Selectable<PhraseWordTable>[]> {
  return getDb()
    .selectFrom("phrase_word")
    .innerJoin("phrase", "phrase.id", "phrase_word.phrase_id")
    .select(["phrase_word.phrase_id", "phrase_word.word_id"])
    .where("phrase.language_id", "=", languageId)
    .execute();
}

export async function findPhraseWordsForPhrase(
  phraseId: number,
): Promise<Selectable<PhraseWordTable>[]> {
  return getDb()
    .selectFrom("phrase_word")
    .selectAll()
    .where("phrase_id", "=", phraseId)
    .execute();
}

export async function findGlossForPhrase(
  phraseId: number,
): Promise<Selectable<GlossTable> | undefined> {
  return getDb()
    .selectFrom("gloss")
    .selectAll()
    .where("phrase_id", "=", phraseId)
    .executeTakeFirst();
}

export async function findGlossHistoryForPhrase(
  phraseId: number,
): Promise<Selectable<GlossHistoryTable>[]> {
  return getDb()
    .selectFrom("gloss_history")
    .selectAll()
    .where("phrase_id", "=", phraseId)
    .execute();
}

export async function findFootnoteForPhrase(
  phraseId: number,
): Promise<Selectable<FootnoteTable> | undefined> {
  return getDb()
    .selectFrom("footnote")
    .selectAll()
    .where("phrase_id", "=", phraseId)
    .executeTakeFirst();
}

export async function findTranslatorNoteForPhrase(
  phraseId: number,
): Promise<Selectable<TranslatorNoteTable> | undefined> {
  return getDb()
    .selectFrom("translator_note")
    .selectAll()
    .where("phrase_id", "=", phraseId)
    .executeTakeFirst();
}

export async function findGlossEventsForPhrase(
  phraseId: number,
): Promise<Selectable<GlossEventTable>[]> {
  return getDb()
    .selectFrom("gloss_event")
    .selectAll()
    .where("phrase_id", "=", phraseId)
    .orderBy("timestamp", "asc")
    .execute();
}
