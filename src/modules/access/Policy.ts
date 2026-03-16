import { SystemRoleRaw } from "@/modules/users/types";
import { ActorClaims, LanguageClaims } from "./model";

export type PolicyOptions =
  | {
      authenticated: false;
    }
  | {
      authenticated?: true;
      systemRoles?: SystemRoleRaw[];
      languageMember?: boolean;
    };

export interface AuthorizationContext {
  actor?: ActorClaims;
  language?: LanguageClaims;
}

export default class Policy<PolicyType extends PolicyOptions = PolicyOptions> {
  constructor(readonly options: PolicyType) {}

  authorize(context: AuthorizationContext): boolean {
    if (!context.actor) {
      return this.options.authenticated === false;
    }

    if (typeof this.options.authenticated === "boolean") {
      return this.options.authenticated;
    }

    const systemRoleMatches = this.options.systemRoles?.some((role) =>
      context.actor!.systemRoles.includes(role),
    );

    const languageRoleMatches =
      this.options.languageMember ? context.language?.isMember : false;

    return (systemRoleMatches || languageRoleMatches) ?? false;
  }

  static SystemRole = SystemRoleRaw;
}
