import { ulid } from "@/shared/ulid";
import { faker } from "@faker-js/faker/locale/en";
import { MachineGlossStrategy, TextDirectionRaw } from "../model";
import { getDb } from "@/db";
import { userFactory } from "@/modules/users/test-utils/userFactory";
import type { Selectable } from "kysely";
import type { LanguageMemberTable, LanguageTable } from "../db/schema";

export interface LanguageFactoryOptions {
  code?: string;
  englishName?: string;
  localName?: string;
  font?: string;
  textDirection?: TextDirectionRaw;
  translationIds?: string[];
  referenceLanguageId?: string | null;
  machineGlossStrategy?: MachineGlossStrategy;
  members?: string[];
}

export interface LanguageFactoryResult {
  language: Selectable<LanguageTable>;
  members: Selectable<LanguageMemberTable>[];
}

export const languageFactory = {
  async build(
    options: LanguageFactoryOptions = {},
  ): Promise<LanguageFactoryResult> {
    const db = getDb();

    const language = await db
      .insertInto("language")
      .values({
        id: ulid(),
        code: options.code ?? nextLocaleCode(),
        english_name: options.englishName ?? faker.lorem.word(),
        local_name: options.localName ?? faker.lorem.word(),
        font: options.font ?? "Noto Sans",
        text_direction: options.textDirection ?? TextDirectionRaw.LTR,
        translation_ids: options.translationIds ?? [],
        reference_language_id: options.referenceLanguageId ?? null,
        machine_gloss_strategy:
          options.machineGlossStrategy ?? MachineGlossStrategy.None,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    let memberUserIds: string[];
    if (options.members === undefined) {
      const { user } = await userFactory.build();
      memberUserIds = [user.id];
    } else {
      memberUserIds = options.members;
    }

    let members: Selectable<LanguageMemberTable>[] = [];
    if (memberUserIds.length > 0) {
      members = await db
        .insertInto("language_member")
        .values(
          memberUserIds.map((userId) => ({
            user_id: userId,
            language_id: language.id,
            invited_at: faker.date.recent(),
          })),
        )
        .returningAll()
        .execute();
    }

    return { language, members };
  },
};

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
