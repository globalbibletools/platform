export { type Language, type LanguageMember } from "./data-access/types";

export enum TextDirectionRaw {
  LTR = "ltr",
  RTL = "rtl",
}

export enum LanguageMemberRoleRaw {
  Translator = "TRANSLATOR",
  Admin = "ADMIN",
}

export class LanguageAlreadyExistsError extends Error {
  constructor(public code: string) {
    super();
  }
}

export class SourceLanguageMissingError extends Error {
  constructor(public languageId: string) {
    super();
  }
}
