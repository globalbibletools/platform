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
});

export const createLogger = logger.child.bind(logger);
