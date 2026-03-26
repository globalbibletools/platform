import { createMiddleware } from "@tanstack/react-start";
import { logger } from "./logging";

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
