import createMiddleware from "next-intl/middleware";
import languages from "./languages.json" assert { type: "json" };

export default createMiddleware({
  locales: Object.keys(languages),
  defaultLocale: "en",
});

export const config = {
  matcher: ["/((?!_next|api|email|.*\\.(?:ico|png|ttf)).*)"],
};
