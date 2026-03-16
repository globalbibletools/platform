import { createMiddleware } from "@tanstack/react-start";
import { notFound, redirect } from "@tanstack/react-router";
import { Session, verifySession } from "@/session";
import claimsRepository from "./claimsRepository";
import { ActorClaims, LanguageClaims } from "./model";
import Policy, { PolicyOptions } from "./Policy";
import { createLogger } from "@/logging";

export interface PolicyContext {
  actor: ActorClaims | undefined;
  language: LanguageClaims | undefined;
}

export function createPolicyMiddleware<
  TData,
  PolicyType extends PolicyOptions,
>({
  policy,
  getLanguageCode,
}: {
  policy: Policy<PolicyType>;
  getLanguageCode?: (data: TData) => string | undefined;
}) {
  type ContextType =
    PolicyType extends { authenticated: false } ? undefined
    : {
        session: Session;
      };

  return createMiddleware({ type: "function" }).server(
    async ({ data, next, serverFnMeta }) => {
      const logger = createLogger({
        serverFn: serverFnMeta.name,
        middleware: "policyMiddleware",
      });

      const session = await verifySession();
      const actorId = session?.user.id;
      const languageCode = getLanguageCode?.(data as TData);

      const [actor, language] = await Promise.all([
        actorId ?
          claimsRepository.findActorClaims(actorId)
        : Promise.resolve(undefined),
        actorId && languageCode ?
          claimsRepository.findLanguageClaims(languageCode, actorId)
        : Promise.resolve(undefined),
      ]);

      if (policy.authorize({ actor, language })) {
        logger.debug("authentication succeeded, continuing");
        return next<ContextType>(
          session ? { context: { session } } : undefined,
        );
      }

      if (policy.options.authenticated === false) {
        throw redirect({ to: "/dashboard" });
      } else if (!actor) {
        throw redirect({ to: "/login" });
      } else {
        throw notFound();
      }
    },
  );
}
