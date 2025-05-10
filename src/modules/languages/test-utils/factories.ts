import { Async } from "factory.ts";
import { DbLanguage, DbLanguageRole } from "../data-access/types";
import { ulid } from "@/shared/ulid";
import { faker } from "@faker-js/faker/locale/en";
import localeMap from "@/data/locale-mapping.json";
import { TextDirectionRaw } from "../model";
import { query } from "@/db";
const locales = Object.keys(localeMap);

export const languageFactory = Async.makeFactory<DbLanguage>({
  id: Async.each(() => ulid()),
  code: Async.each(() => faker.helpers.arrayElement(locales)),
  name: Async.each(() => faker.lorem.word()),
  font: "Noto Sans",
  textDirection: TextDirectionRaw.LTR,
  translationIds: Async.each(() => []),
  referenceLanguageId: null,
}).transform(async (lang) => {
  await query(
    `
        insert into language (id, code, name, font, text_direction, translation_ids, reference_language_id)
        values ($1, $2, $3, $4, $5, $6, $7)
      `,
    [
      lang.id,
      lang.code,
      lang.name,
      lang.font,
      lang.textDirection,
      lang.translationIds,
      lang.referenceLanguageId,
    ],
  );
  return lang;
});

export const languageRoleFactory = Async.makeFactoryWithRequired<
  DbLanguageRole,
  "userId" | "languageId"
>({
  role: "VIEWER",
}).transform(async (role) => {
  await query(
    `
        insert into language_member_role (language_id, user_id, role)
        values ($1, $2, $3)
      `,
    [role.languageId, role.userId, role.role],
  );
  return role;
});
