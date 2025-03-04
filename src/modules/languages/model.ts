export enum TextDirectionRaw {
  LTR = "ltr",
  RTL = "rtl",
}

export enum LanguageMemberRoleRaw {
  Translator = "TRANSLATOR",
  Admin = "ADMIN",
}

export interface Language {
  id: string;
  name: string;
  code: string;
  font?: string;
  textDirection: TextDirectionRaw;
  translationIds: string[];
  gtSourceLanguage: string;
}

export interface LanguageMember {
  languageId: string;
  userId: string;
  roles: LanguageMemberRoleRaw[];
}

export class LanguageAlreadyExistsError extends Error {
  constructor(public code: string) {
    super();
  }
}
