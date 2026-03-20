import { createMiddleware } from "@tanstack/react-start";
import { Session, verifySession } from "@/session";
import claimsRepository from "./claimsRepository";
import { ActorClaims } from "./model";
import Policy, { PolicyOptions } from "./Policy";
import { createLogger } from "@/logging";

export interface PolicyContext {
  actor: ActorClaims | undefined;
  language:
    | {
        code: string;
        isMember: boolean;
      }
    | undefined;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("UnauthorizedError");
  }
}

type ContextType<PolicyType extends PolicyOptions> =
  PolicyType extends { authenticated: false } ? undefined
  : {
      session: Session;
    };

export function createPolicyMiddleware<PolicyType extends PolicyOptions>({
  policy,
  languageCodeField,
}: {
  policy: Policy<PolicyType>;
  languageCodeField?: string;
}) {
  return createMiddleware({ type: "function" })
    .inputValidator((x) => x)
    .server(async ({ next, data, serverFnMeta }) => {
      const logger = createLogger({
        serverFn: serverFnMeta?.name,
        middleware: "policyMiddleware",
      });

      const languageCode = getLanguageCode(data, languageCodeField);

      const session = await verifySession();
      const actorId = session?.user.id;

      const [actor, language] = await Promise.all([
        actorId ?
          claimsRepository.findActorClaims(actorId)
        : Promise.resolve(undefined),
        actorId && languageCode ?
          claimsRepository.findLanguageClaims(languageCode, actorId)
        : Promise.resolve(undefined),
      ]);

      if (!policy.authorize({ actor, language })) {
        logger.info("authorization failed");
        throw new UnauthorizedError();
      }

      return next<ContextType<PolicyType>>(
        // I haven't found a good way to handle this without a cast
        // since a session is only expected here
        // if the policy permits an authenticated user through
        session ?
          { context: { session } as ContextType<PolicyType> }
        : undefined,
      );
    });
}

function getLanguageCode(
  data: unknown,
  fieldName?: string,
): string | undefined {
  if (!fieldName) {
    return undefined;
  }

  if (data instanceof FormData) {
    return data.get(fieldName)?.toString();
  }

  if (typeof data !== "object" || data === null) {
    return undefined;
  }

  // We have to cast to a Record type so that we can index into it.
  const dataAsObject = data as Record<string, unknown>;

  if (typeof dataAsObject[fieldName] === "string") {
    return dataAsObject[fieldName];
  }

  return undefined;
}
