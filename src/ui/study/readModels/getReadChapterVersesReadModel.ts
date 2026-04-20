import { getDb } from "@/db";
import { GlossStateRaw } from "@/modules/translation/types";
import { jsonArrayFrom } from "kysely/helpers/postgres";

export interface ReadChapterWordReadModel {
  id: string;
  text: string;
  gloss: string | null;
  linkedWords: string[];
  lemma: string;
  grammar: string;
  footnote: string | null;
  nativeLexicon: string | null;
}

export interface ReadChapterVerseReadModel {
  id: string;
  number: number;
  words: ReadChapterWordReadModel[];
}

export async function getReadChapterVersesReadModel(
  bookId: number,
  chapterNumber: number,
  code: string,
): Promise<Array<ReadChapterVerseReadModel>> {
  const db = getDb();

  const languageIdSubquery = db
    .selectFrom("language")
    .where("code", "=", code)
    .select("id");

  const result = await db
    .selectFrom("verse as v")
    .where("v.book_id", "=", bookId)
    .where("v.chapter", "=", chapterNumber)
    .select((eb) => [
      "v.id",
      "v.number",
      jsonArrayFrom(
        eb
          .selectFrom("word as w")
          .leftJoin("word_lexicon as wl", "wl.word_id", "w.id")
          .innerJoin("lemma_form as lf", "lf.id", "w.form_id")
          .leftJoinLateral(
            (lateralEb) =>
              lateralEb
                .selectFrom("phrase_word as phw")
                .innerJoin("phrase as ph", "ph.id", "phw.phrase_id")
                .whereRef("phw.word_id", "=", "w.id")
                .where("ph.deleted_at", "is", null)
                .where("ph.language_id", "=", languageIdSubquery)
                .select("ph.id")
                .as("ph"),
            (join) => join.onTrue(),
          )
          .leftJoin("gloss as g", (join) =>
            join
              .onRef("g.phrase_id", "=", "ph.id")
              .on("g.state", "=", GlossStateRaw.Approved),
          )
          .leftJoin("footnote as fn", "fn.phrase_id", "ph.id")
          .leftJoinLateral(
            (lateralEb) =>
              lateralEb
                .selectFrom("phrase_word as phw2")
                .whereRef("phw2.phrase_id", "=", "ph.id")
                .whereRef("phw2.word_id", "!=", "w.id")
                .select((wordEb) =>
                  wordEb.fn
                    .agg<string[]>("array_agg", ["phw2.word_id"])
                    .as("linkedWords"),
                )
                .as("wds"),
            (join) => join.onTrue(),
          )
          .whereRef("w.verse_id", "=", "v.id")
          .orderBy("w.id")
          .select([
            "w.id",
            "w.text",
            "g.gloss",
            (eb) =>
              eb.fn
                .coalesce("wds.linkedWords", eb.val<string[]>([]))
                .as("linkedWords"),
            "lf.lemma_id as lemma",
            "lf.grammar",
            "fn.content as footnote",
            "wl.content as nativeLexicon",
          ]),
      ).as("words"),
    ])
    .execute();

  return result;
}
