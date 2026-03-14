import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import appCss from "./styles.css?url";
import TimezoneTracker from "./shared/i18n/TimezoneTracker";
import { AnalyticsProvider } from "./analytics";
import { getCurrentLocale } from "./shared/i18n/shared";
import { IntlProvider } from "next-intl";
import { fetchLocaleMessages } from "./shared/i18n/fetchLocaleMessages";

export const Route = createRootRoute({
  // TODO: This probably isn't the right way to load the messages.
  loaderDeps: () => {
    const locale = getCurrentLocale();

    return { localeCode: locale.code };
  },
  loader: async ({ deps }) => {
    return await fetchLocaleMessages({ data: { localeCode: deps.localeCode } });
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      { title: "Global Bible Tools" },
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
  const locale = getCurrentLocale();
  const messages = Route.useLoaderData();

  return (
    <html lang={locale.code} dir={locale.dir} className={locale.class}>
      <head>
        <HeadContent />
      </head>
      <body>
        <TimezoneTracker />
        <AnalyticsProvider id={process.env.VITE_FATHOM_ID} />
        <IntlProvider locale={locale.code} messages={messages}>
          <Outlet />
        </IntlProvider>
        <Scripts />
      </body>
    </html>
  );
}
