import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

const LEGACY_READER_URL_REGEX = /^\/read\/(\w{5})$/;

export default async function middleware(request: NextRequest) {
  let response = handleI18nRouting(request);

  if (response.ok) {
    // (not for errors or redirects)
    const [, locale, ...rest] = new URL(
      response.headers.get("x-middleware-rewrite") || request.url,
    ).pathname.split("/");
    const pathname = "/" + rest.join("/");

    // Need to support the links embedded in the Aleph with Beth schedule app until we develop a permalink system
    const match = LEGACY_READER_URL_REGEX.exec(pathname);
    if (match) {
      response = NextResponse.redirect(
        new URL(`/${locale}/read/eng/${match[1]}`, request.url),
        { headers: response.headers },
      );
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next|api|email|p|.*\\.(?:ico|png|ttf|txt)).*)"],
};
