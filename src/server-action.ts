import { logger } from "./logging";

export function serverActionLogger(name: string, args?: any) {
  logger.info({
    action: name,
    args,
  });

  return logger.child({
    action: name,
  });
}
