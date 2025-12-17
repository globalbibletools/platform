import { getDb } from "@/db";
import { Language } from "../model";
import { sql } from "kysely";

const languageRepository = {
  async existsById(id: string): Promise<boolean> {
    const result = await getDb()
      .selectFrom("language")
      .where("id", "=", id)
      .executeTakeFirst();

    return Boolean(result);
  },

  async existsByCode(code: string): Promise<boolean> {
    const result = await getDb()
      .selectFrom("language")
      .where("code", "=", code)
      .executeTakeFirst();

    return Boolean(result);
  },

  async findByCode(code: string): Promise<Language | undefined> {
    const result = await getDb()
      .selectFrom("language")
      .select([
        "id",
        "code",
        "name",
        "font",
        "text_direction as textDirection",
        sql<
          string[]
        >`coalesce(${sql.ref("translation_ids")}, array[]::text[])`.as(
          "translationIds",
        ),
        "reference_language_id as referenceLanguageId",
      ])
      .where("code", "=", code)
      .executeTakeFirst();

    return result;
  },

  async create(
    language: Pick<Language, "id" | "code" | "name">,
  ): Promise<void> {
    await getDb()
      .insertInto("language")
      .values({
        id: language.id,
        code: language.code,
        name: language.name,
      })
      .execute();
  },

  async update(language: Omit<Language, "id">): Promise<void> {
    await getDb()
      .updateTable("language")
      .set({
        name: language.name,
        font: language.font,
        text_direction: language.textDirection,
        translation_ids: language.translationIds,
        reference_language_id: language.referenceLanguageId ?? undefined,
      })
      .where("code", "=", language.code)
      .execute();
  },
};
export default languageRepository;
