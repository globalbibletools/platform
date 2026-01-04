import { SystemRoleRaw } from "@/modules/users/model/SystemRole";
import claimsRepository from "./claimsRepository";

export interface PolicyOptions {
  systemRoles?: SystemRoleRaw[];
  languageMember?: boolean;
}

export interface AuthorizationContext {
  actorId?: string;
  languageCode?: string;
}

export default class Policy {
  constructor(private readonly options: PolicyOptions) {}

  async authorize(context: AuthorizationContext): Promise<boolean> {
    if (!context.actorId) return false;

    const [actor, language] = await Promise.all([
      claimsRepository.findActorClaims(context.actorId),
      context.languageCode ?
        claimsRepository.findLanguageClaims(
          context.languageCode,
          context.actorId,
        )
      : undefined,
    ]);

    const systemRoleMatches = this.options.systemRoles?.some((role) =>
      actor.systemRoles.includes(role),
    );

    const languageRoleMatches =
      this.options.languageMember ? language?.isMember : false;

    return (systemRoleMatches || languageRoleMatches) ?? false;
  }

  static SystemRole = SystemRoleRaw;
}
