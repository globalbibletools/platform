import { LanguageMemberRoleRaw, TextDirectionRaw } from "../model";

export interface DbLanguage {
  id: string;
  code: string;
  name: string;
  font: string;
  textDirection: TextDirectionRaw;
  translationIds: string[];
  referenceLanguageId?: string | null;
}

export interface DbLanguageRole {
  languageId: string;
  userId: string;
  role: LanguageMemberRoleRaw | "VIEWER";
}

export type Language = DbLanguage;

export type LanguageMember = Omit<DbLanguageRole, "role"> & {
  roles: LanguageMemberRoleRaw[];
};

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
  update(member: LanguageMember): Promise<void>;
  delete(languageId: string, memberId: string): Promise<void>;
  deleteAll(memberId: string): Promise<void>;
}
