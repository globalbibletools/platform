import { createMiddleware } from "@tanstack/react-start";
import { getCurrentLocale } from "./shared/i18n/shared";

const LEGACY_READER_URL_REGEX = /^\/read\/(\w{5})$/;

export const legacyRedirectMiddleware = createMiddleware().server(
  ({ request, next }) => {
    const url = new URL(request.url);
    const match = LEGACY_READER_URL_REGEX.exec(url.pathname);
    if (!match) {
      return next();
    }

    const locale = getCurrentLocale();
    return Response.redirect(
      new URL(`/${locale.code}/read/eng/${match[1]}`, request.url),
    );
  },
);
