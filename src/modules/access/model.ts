export enum LanguageRole {
  Admin = "ADMIN",
  Translator = "TRANSLATOR",
  Viewer = "VIEWER",
}

export enum SystemRole {
  Admin = "ADMIN",
  User = "USER",
}

export interface ActorClaims {
  id: string;
  systemRoles: SystemRole[];
}

export interface LanguageClaims {
  code: string;
  roles: LanguageRole[];
}
