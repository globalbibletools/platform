import { vitest } from "vitest";

export const logger = {
  error: vitest.fn(),
  info: vitest.fn(),
  debug: vitest.fn(),
  warn: vitest.fn(),
  child: vitest.fn((bindings) => {
    return {
      warn: (metaOrMessage: string | object, message?: string) => {
        if (typeof metaOrMessage === "string") {
          return logger.warn(bindings, metaOrMessage);
        } else {
          return logger.warn(
            {
              ...bindings,
              ...metaOrMessage,
            },
            message,
          );
        }
      },
      debug: (metaOrMessage: string | object, message?: string) => {
        if (typeof metaOrMessage === "string") {
          return logger.debug(bindings, metaOrMessage);
        } else {
          return logger.debug(
            {
              ...bindings,
              ...metaOrMessage,
            },
            message,
          );
        }
      },
      info: (metaOrMessage: string | object, message?: string) => {
        if (typeof metaOrMessage === "string") {
          return logger.info(bindings, metaOrMessage);
        } else {
          return logger.info(
            {
              ...bindings,
              ...metaOrMessage,
            },
            message,
          );
        }
      },
      error: (metaOrMessage: string | object, message?: string) => {
        if (typeof metaOrMessage === "string") {
          return logger.error(bindings, metaOrMessage);
        } else {
          return logger.error(
            {
              ...bindings,
              ...metaOrMessage,
            },
            message,
          );
        }
      },
    };
  }),
};

export const createLogger = logger.child.bind(logger);
