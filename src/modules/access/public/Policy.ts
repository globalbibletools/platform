import claimsRepository from "../claimsRepository";
import { SystemRole, LanguageRole } from "../model";

export interface PolicyOptions {
  systemRoles?: SystemRole[];
  languageRoles?: LanguageRole[];
}

export interface AuthorizationContext {
  userId?: string;
  languageCode?: string;
}

export default class Policy {
  constructor(private readonly options: PolicyOptions) {}

  async authorize(context: AuthorizationContext): Promise<boolean> {
    if (!context.userId) return false;

    let claims;
    if (context.languageCode) {
      claims = await claimsRepository.findUserClaimsWithLanguage(
        context.userId,
        context.languageCode,
      );
    } else {
      claims = await claimsRepository.findUserClaims(context.userId);
    }

    const systemRoleMatches = this.options.systemRoles?.some((role) =>
      claims.systemRoles.includes(role),
    );
    const languageRoleMatches = this.options.languageRoles?.some((role) =>
      claims.languageRoles?.includes(role),
    );

    return (systemRoleMatches || languageRoleMatches) ?? false;
  }

  static SystemRole = SystemRole;
  static LanguageRole = LanguageRole;
}
