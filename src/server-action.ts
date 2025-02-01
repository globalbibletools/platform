import { ZodError } from "zod";
import { FormState } from "./components/Form";
import { logger } from "./logging";
import { UnauthorizedError } from "./modules/access-control/errors";

export interface ServerActionOptions<Args extends any[], Return> {
  name: string;
  fn: (...args: [...Args]) => Promise<Return>;
  logArgs?: (...args: [...Args]) => any;
}

export function createServerAction<Args extends any[], Return>({
  name,
  fn,
  logArgs,
}: ServerActionOptions<Args, Return>) {
  return async (...args: [...Args]) => {
    const argsForLogs = logArgs?.(...args);

    try {
      const result = await fn(...args);

      logger.info({
        action: name,
        args: argsForLogs,
      });

      return result;
    } catch (error) {
      logger.info({
        action: name,
        args: argsForLogs,
        error: `${error}`,
      });
    }
  };
}

export function serverActionLogger(name: string, args?: any) {
  logger.info({
    action: name,
    args,
  });

  return logger.child({
    action: name,
  });
}

export function handleError(error: unknown): FormState {
  if (error instanceof UnauthorizedError) {
    logger.error("unauthorized");
    return { state: "error", errorCode: "Unauthorized" };
  } else if (error instanceof ZodError) {
    logger.error("malformed request");
    return { state: "error", errorCode: "MalformedRequest" };
  } else {
    if (error instanceof Error) {
      logger.error({ stack: error.stack }, error.message);
    } else {
      logger.error(error);
    }
    return { state: "error", errorCode: "Unknown" };
  }
}
