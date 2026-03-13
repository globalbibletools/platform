import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import languages from "@/shared/i18n/languages.json";
import appCss from "@/styles.css?url";
import TimezoneTracker from "./shared/i18n/TimezoneTracker";
import { AnalyticsProvider } from "./analytics";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      { title: "Global Bible tools" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  component: RootLayout,
});

function RootLayout() {
  const locale = "en"; // TODO: replace with locale from route
  const language = languages[locale];

  return (
    <html lang={locale} dir={language.dir} className={language.class}>
      <head>
        <HeadContent />
      </head>
      <body>
        <TimezoneTracker />
        <AnalyticsProvider id={process.env.VITE_FATHOM_ID} />
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
