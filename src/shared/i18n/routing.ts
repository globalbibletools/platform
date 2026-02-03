import { defineRouting } from "next-intl/routing";
import languages from "./languages.json" assert { type: "json" };

export const routing = defineRouting({
  locales: Object.keys(languages),
  defaultLocale: "en",
});
