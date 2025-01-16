import { logger } from "./logging";

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
