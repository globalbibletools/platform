import createMiddleware from "next-intl/middleware";
import languages from "./languages.json" assert { type: "json" };
import { NextRequest, NextResponse } from "next/server";

const handleI18nRouting = createMiddleware({
  locales: Object.keys(languages),
  defaultLocale: "en",
});

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

    // Redirect for /read
    if (pathname === "/read") {
      const lastRead = request.cookies.get("LAST_READ")?.value;
      if (lastRead) {
        const [code, chapterId] = lastRead.split(",");
        if (code && chapterId) {
          return NextResponse.redirect(
            new URL(`/${locale}/read/${code}/${chapterId}`, request.url),
          );
        }
      }
      // fallback
      return NextResponse.redirect(
        new URL(`/${locale}/read/eng/01001`, request.url),
      );
    }

    // Redirect for /translate
    if (pathname === "/translate") {
      const lastTranslation = request.cookies.get("LAST_TRANSLATION")?.value;
      if (lastTranslation) {
        const [code, verseId] = lastTranslation.split(",");
        if (code && verseId) {
          return NextResponse.redirect(
            new URL(`/${locale}/translate/${code}/${verseId}`, request.url),
          );
        }
      }
      // fallback
      return NextResponse.redirect(
        new URL(`/${locale}/translate/eng/01001001`, request.url),
      );
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next|api|email|p|.*\\.(?:ico|png|ttf|txt)).*)"],
};
