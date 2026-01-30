import { getDb } from "@/db";
import { jsonArrayFrom, jsonBuildObject } from "kysely/helpers/postgres";

export interface VerseWordReadModel {
  id: string;
  text: string;
  referenceGloss?: string;
  lemma: string;
  formId: string;
  grammar: string;
  resource?: { name: string; entry: string };
}

export interface VerseWordsReadModel {
  words: VerseWordReadModel[];
}

export async function getVerseWordsReadModel(
  verseId: string,
  code: string,
): Promise<VerseWordsReadModel | undefined> {
  const db = getDb();

  const referenceLanguageIdSubquery = db
    .selectFrom("language")
    .where("code", "=", code)
    .select((eb) =>
      eb
        .case()
        .when("reference_language_id", "is", null)
        .then(eb.selectFrom("language").where("code", "=", "eng").select("id"))
        .else(eb.ref("reference_language_id"))
        .end()
        .as("ref_lang_id"),
    );

  const result = await db
    .selectFrom("verse as v")
    .where("v.id", "=", verseId)
    .select((eb) => [
      jsonArrayFrom(
        eb
          .selectFrom("word as w")
          .innerJoin("lemma_form as lf", "lf.id", "w.form_id")
          .where("w.verse_id", "=", eb.ref("v.id"))
          .orderBy("w.id")
          .select((wordEb) => [
            "w.id",
            "w.text",
            "lf.lemma_id as lemma",
            "lf.id as formId",
            "lf.grammar",
            wordEb
              .selectFrom("phrase_word as phw")
              .innerJoin("phrase as ph", "ph.id", "phw.phrase_id")
              .innerJoin("gloss as g", "g.phrase_id", "ph.id")
              .where("phw.word_id", "=", wordEb.ref("w.id"))
              .where("ph.language_id", "=", referenceLanguageIdSubquery)
              .where("ph.deleted_at", "is", null)
              .select("g.gloss")
              .limit(1)
              .as("referenceGloss"),
            wordEb
              .selectFrom("lemma_resource as lr")
              .where("lr.lemma_id", "=", wordEb.ref("lf.lemma_id"))
              .select((lrEb) =>
                jsonBuildObject({
                  name: lrEb.ref("lr.resource_code"),
                  entry: lrEb.ref("lr.content"),
                }).as("resource"),
              )
              .as("resource"),
          ]),
      ).as("words"),
    ])
    .executeTakeFirst();

  return result as VerseWordsReadModel | undefined;
}
