import { createStart } from "@tanstack/react-start";
import { localeMiddleware } from "./shared/i18n/middleware";
import { legacyRedirectMiddleware } from "./legacyRedirectMiddleware";
import {
  functionLoggingMiddleware,
  loggingMiddleware,
} from "./loggingMiddleware";

export const startInstance = createStart(() => ({
  requestMiddleware: [
    loggingMiddleware,
    legacyRedirectMiddleware,
    localeMiddleware,
  ],
  functionMiddleware: [functionLoggingMiddleware],
}));
