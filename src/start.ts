import { createStart } from "@tanstack/react-start";
import { localeMiddleware } from "./shared/i18n/middleware";

export const startInstance = createStart(() => ({
  requestMiddleware: [localeMiddleware],
}));
