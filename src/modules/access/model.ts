import { SystemRoleRaw } from "../users/model/SystemRole";

export interface ActorClaims {
  id: string;
  systemRoles: SystemRoleRaw[];
}

export interface LanguageClaims {
  code: string;
  isMember: boolean;
}
