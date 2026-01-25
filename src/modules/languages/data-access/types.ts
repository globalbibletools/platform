import { Generated } from "kysely";
import { TextDirectionRaw } from "../model";

export interface LanguageTable {
  id: Generated<string>;
  code: string;
  local_name: string;
  english_name: string;
  font: Generated<string>;
  text_direction: Generated<TextDirectionRaw>;
  translation_ids: Generated<Array<string>> | null;
  reference_language_id: string | null;
}

export interface LanguageMemberTable {
  user_id: string;
  language_id: string;
  invited_at: Date;
}

export interface DbLanguage {
  id: string;
  code: string;
  englishName: string;
  localName: string;
  font: string;
  textDirection: TextDirectionRaw;
  translationIds: string[];
  referenceLanguageId?: string | null;
}

export interface DbLanguageMember {
  languageId: string;
  userId: string;
  invitedAt: Date;
}

export type Language = DbLanguage;

export type LanguageMember = Omit<DbLanguageMember, "invitedAt">;

export interface LanguageRepository {
  existsById(id: string): Promise<boolean>;
  existsByCode(code: string): Promise<boolean>;
  findByCode(code: string): Promise<Language | undefined>;
  update(language: Omit<Language, "id">): Promise<void>;
  create(language: Language): Promise<void>;
}

export interface LanguageMemberRepository {
  exists(languageId: string, memberId: string): Promise<boolean>;
  create(member: LanguageMember): Promise<void>;
  delete(languageId: string, memberId: string): Promise<void>;
  deleteAll(memberId: string): Promise<void>;
}
