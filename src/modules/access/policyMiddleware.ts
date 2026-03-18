import {
  createMiddleware,
  FunctionMiddlewareServerNextFn,
  FunctionMiddlewareWithTypes,
  IntersectAllValidatorOutputs,
  ServerFnMeta,
} from "@tanstack/react-start";
import { Expand, ValidatorAdapter } from "@tanstack/react-router";
import { Session, verifySession } from "@/session";
import claimsRepository from "./claimsRepository";
import { ActorClaims, LanguageClaims } from "./model";
import Policy, { PolicyOptions } from "./Policy";
import { createLogger } from "@/logging";
import { ParseMiddleware } from "@/parseMiddleware";

export interface PolicyContext {
  actor: ActorClaims | undefined;
  language: LanguageClaims | undefined;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("UnauthorizedError");
  }
}

type AuthMiddleware<PolicyType extends PolicyOptions> =
  FunctionMiddlewareWithTypes<
    {},
    unknown,
    undefined,
    ContextType<PolicyType>,
    undefined,
    undefined,
    undefined
  >;
type AuthMiddlewareWithParse<
  PolicyType extends PolicyOptions,
  Parsed,
> = FunctionMiddlewareWithTypes<
  {},
  readonly [ParseMiddleware<Parsed>],
  undefined,
  ContextType<PolicyType>,
  undefined,
  undefined,
  undefined
>;

type ContextType<PolicyType extends PolicyOptions> =
  PolicyType extends { authenticated: false } ? undefined
  : {
      session: Session;
    };

export function createPolicyMiddleware<
  PolicyType extends PolicyOptions,
  Parsed,
>({
  policy,
  parseMiddleware,
  selectLanguageCode,
}: {
  policy: Policy<PolicyType>;
  parseMiddleware: ParseMiddleware<Parsed>;
  selectLanguageCode: (
    data: Expand<
      IntersectAllValidatorOutputs<unknown, ValidatorAdapter<unknown, Parsed>>
    >,
  ) => string | undefined;
}): AuthMiddlewareWithParse<PolicyType, Parsed>;
export function createPolicyMiddleware<PolicyType extends PolicyOptions>({
  policy,
}: {
  policy: Policy<PolicyType>;
}): AuthMiddleware<PolicyType>;
export function createPolicyMiddleware<
  PolicyType extends PolicyOptions,
  Parsed = unknown,
>({
  policy,
  parseMiddleware,
  selectLanguageCode,
}: {
  policy: Policy<PolicyType>;
  parseMiddleware?: ParseMiddleware<Parsed>;
  selectLanguageCode?: (
    data: Expand<
      IntersectAllValidatorOutputs<unknown, ValidatorAdapter<unknown, Parsed>>
    >,
  ) => string | undefined;
}) {
  async function impl<TMiddleware>({
    next,
    serverFnMeta,
    languageCode,
  }: {
    next: FunctionMiddlewareServerNextFn<{}, TMiddleware, undefined>;
    serverFnMeta: ServerFnMeta;
    languageCode?: string;
  }) {
    const logger = createLogger({
      serverFn: serverFnMeta?.name,
      middleware: "policyMiddleware",
    });

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
      session ? { context: { session } as ContextType<PolicyType> } : undefined,
    );
  }

  if (parseMiddleware) {
    return createMiddleware({ type: "function" })
      .middleware([parseMiddleware])
      .server(({ next, data, serverFnMeta }) => {
        const languageCode = selectLanguageCode?.(data);
        return impl({ next, serverFnMeta, languageCode });
      });
  } else {
    return createMiddleware({ type: "function" }).server(impl);
  }
}
