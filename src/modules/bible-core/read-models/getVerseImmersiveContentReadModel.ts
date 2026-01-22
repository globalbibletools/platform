import { getDb } from "@/db";
import { sql } from "kysely";
import { jsonBuildObject } from "kysely/helpers/postgres";

export interface VerseQuestionReadModel {
  question: string;
  response: string;
}

export interface VerseImmersiveContentReadModel {
  commentary: string | null;
  questions: VerseQuestionReadModel[];
}

export async function getVerseImmseriveContentReadModel(
  verseId: string,
): Promise<VerseImmersiveContentReadModel | undefined> {
  const query = getDb()
    .selectFrom("verse")
    .where("verse.id", "=", verseId)
    .select(({ selectFrom, fn }) => [
      selectFrom("verse_commentary")
        .whereRef("verse_commentary.verse_id", "=", "verse.id")
        .select("content")
        .as("commentary"),
      fn
        .coalesce(
          selectFrom("verse_question")
            .whereRef("verse_question.verse_id", "=", "verse.id")
            .select(({ fn, eb }) =>
              fn
                .jsonAgg(
                  jsonBuildObject({
                    question: eb.ref("question"),
                    response: eb.ref("response"),
                  }),
                )
                .as("questions"),
            ),
          sql<Array<VerseQuestionReadModel>>`'[]'::json`,
        )
        .as("questions"),
    ]);

  return query.executeTakeFirst();
}
