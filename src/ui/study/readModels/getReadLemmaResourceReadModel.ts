import { getDb } from "@/db";

export interface ReadLemmaResourceReadModel {
  lemmaId: string;
  name: string;
  entry: string;
}

export async function getReadLemmaResourceReadModel(
  lemmaId: string,
): Promise<ReadLemmaResourceReadModel | undefined> {
  const result = await getDb()
    .selectFrom("lemma_resource as lr")
    .where("lr.lemma_id", "=", lemmaId)
    .select([
      "lr.lemma_id as lemmaId",
      "lr.resource_code as name",
      "lr.content as entry",
    ])
    .limit(1)
    .executeTakeFirst();

  return result;
}
