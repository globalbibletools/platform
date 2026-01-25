import { Async } from "factory.ts";
import { DbLanguage, DbLanguageMember } from "../data-access/types";
import { ulid } from "@/shared/ulid";
import { faker } from "@faker-js/faker/locale/en";
import localeMap from "@/data/locale-mapping.json";
import { TextDirectionRaw } from "../model";
import { getDb, query } from "@/db";
const locales = Object.keys(localeMap);

export const languageFactory = Async.makeFactory<DbLanguage>({
  id: Async.each(() => ulid()),
  code: Async.each(() => faker.helpers.arrayElement(locales)),
  englishName: Async.each(() => faker.lorem.word()),
  localName: Async.each(() => faker.lorem.word()),
  font: "Noto Sans",
  textDirection: TextDirectionRaw.LTR,
  translationIds: Async.each(() => []),
  referenceLanguageId: null,
}).transform(async (lang) => {
  await query(
    `
        insert into language (id, code, english_name, font, text_direction, translation_ids, reference_language_id, local_name)
        values ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
    [
      lang.id,
      lang.code,
      lang.englishName,
      lang.font,
      lang.textDirection,
      lang.translationIds,
      lang.referenceLanguageId,
      lang.localName,
    ],
  );
  return lang;
});

export const languageMemberFactory = Async.makeFactoryWithRequired<
  DbLanguageMember,
  "userId" | "languageId"
>({
  invitedAt: Async.each(() => faker.date.recent()),
}).transform(async (member) => {
  await getDb()
    .insertInto("language_member")
    .values({
      user_id: member.userId,
      language_id: member.languageId,
      invited_at: member.invitedAt,
    })
    .execute();
  return member;
});
