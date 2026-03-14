import { createMiddleware } from "@tanstack/react-start";
import {
  extractLocaleFromPath,
  shouldIgnorePath,
  stripLocalePrefix,
  withLocalePrefix,
  defaultLocale,
} from "./shared";

export const localeMiddleware = createMiddleware({
  type: "request",
}).server(async ({ request, next }) => {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (shouldIgnorePath(pathname)) {
    return next();
  }

  const pathLocale = extractLocaleFromPath(pathname);
  if (pathLocale) {
    const strippedUrl = stripLocalePrefix(
      new URL(request.url),
      pathLocale.code,
    );
    if (shouldIgnorePath(strippedUrl.pathname)) {
      return Response.redirect(strippedUrl.toString(), 307);
    }
  } else {
    const redirectUrl = withLocalePrefix(
      new URL(request.url),
      defaultLocale.code,
    );
    return Response.redirect(redirectUrl.toString(), 307);
  }

  return await next();
});
