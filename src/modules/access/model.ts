import { SystemRoleRaw } from "@/modules/users/types";

export interface ActorClaims {
  id: string;
  systemRoles: SystemRoleRaw[];
}

export interface LanguageClaims {
  code: string;
  isMember: boolean;
}
