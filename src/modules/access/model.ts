export enum LanguageRole {
  Admin = "ADMIN",
  Translator = "TRANSLATOR",
}

export enum SystemRole {
  Admin = "ADMIN",
  User = "USER",
}

export interface UserClaims {
  id: string;
  systemRoles: SystemRole[];
  languageRoles?: LanguageRole[];
}
