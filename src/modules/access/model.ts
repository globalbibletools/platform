import { SystemRoleRaw } from "@/modules/users/model/SystemRole";

export interface ActorClaims {
  id: string;
  systemRoles: SystemRoleRaw[];
}

export interface LanguageClaims {
  code: string;
  isMember: boolean;
}
