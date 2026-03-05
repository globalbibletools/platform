import { getDb } from "@/db";
import { Selectable } from "kysely";
import type {
  FootnoteTable,
  GlossHistoryTable,
  GlossTable,
  TranslatorNoteTable,
} from "../db/schema";

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
