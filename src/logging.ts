import { trace } from "@opentelemetry/api";
import pino from "pino";

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
  mixin:
    process.env.NODE_ENV === "production" ?
      () => {
        const span = trace.getActiveSpan();
        if (!span) return {};

        const context = span.spanContext();
        return {
          spanId: context.spanId,
          traceId: context.traceId,
        };
      }
    : undefined,
});

export const createLogger = logger.child.bind(logger);
