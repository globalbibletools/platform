import { Async } from "factory.ts";
import { DbLanguage, DbLanguageMember } from "../data-access/types";
import { ulid } from "@/shared/ulid";
import { faker } from "@faker-js/faker/locale/en";
import { MachineGlossStrategy, TextDirectionRaw } from "../model";
import { getDb, query } from "@/db";

const locales = ["eng", "spa", "hin", "arb"];
let nextLocaleIndex = 0;
/**
 * Generate pseudo random locale codes.
 *
 * A true random locale selection is likely to create collisions on the unique index,
 * so this utility iterates through a list of locale codes.
 * Presently, this can produce up to four unique locale codes before repetition.
 */
export function nextLocaleCode(): string {
  const localeCode = locales[nextLocaleIndex];
  nextLocaleIndex = (nextLocaleIndex + 1) % locales.length;
  return localeCode;
}

export const languageFactory = Async.makeFactory<DbLanguage>({
  id: Async.each(() => ulid()),
  code: Async.each(() => nextLocaleCode()),
  englishName: Async.each(() => faker.lorem.word()),
  localName: Async.each(() => faker.lorem.word()),
  font: "Noto Sans",
  textDirection: TextDirectionRaw.LTR,
  translationIds: Async.each(() => []),
  referenceLanguageId: null,
  machineGlossStrategy: MachineGlossStrategy.None,
}).transform(async (lang) => {
  await query(
    `
        insert into language (id, code, english_name, font, text_direction, translation_ids, reference_language_id, local_name, machine_gloss_strategy)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
      lang.machineGlossStrategy,
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
