import {
  createMiddleware,
  FunctionMiddlewareServerNextFn,
  RequestServerNextFn,
} from "@tanstack/react-start";
import pino from "pino";
import { server } from "typescript";

// If this changes, update the pino configuration in the next patch so it matches
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  formatters: {
    level: (label) => ({ level: label }),
  },
  base:
    process.env.NODE_ENV === "production" ?
      {
        service: process.env.SERVICE_NAME || "platform-server",
        pid: process.pid,
      }
    : undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
});

export const createLogger = logger.child.bind(logger);

export const loggingMiddleware = createMiddleware().server(
  async ({ request, next }) => {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/_serverFn")) {
      return next();
    }

    const start = performance.now();

    try {
      const result = await next();

      logger.info({
        request: {
          url: request.url,
          method: request.method,
        },
        response: {
          status: result.response?.status,
          latency: performance.now() - start,
        },
      });

      return result;
    } catch (err) {
      logger.error({
        request: {
          url: request.url,
          method: request.method,
        },
        response: {
          error: err instanceof Error ? err.message : `${err}`,
          latency: performance.now() - start,
        },
      });

      throw err;
    }
  },
);
export const functionLoggingMiddleware = createMiddleware({
  type: "function",
}).server(async ({ serverFnMeta, next }) => {
  const start = performance.now();

  try {
    const result = await next();

    logger.info({
      request: {
        serverFn: serverFnMeta.name,
      },
      response: {
        latency: performance.now() - start,
      },
    });

    return result;
  } catch (err) {
    logger.error({
      request: {
        serverFn: serverFnMeta.name,
      },
      response: {
        error: err instanceof Error ? err.message : `${err}`,
        latency: Math.ceil(performance.now() - start),
      },
    });

    throw err;
  }
});
