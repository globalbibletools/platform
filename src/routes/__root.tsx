import {
  Outlet,
  HeadContent,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import appCss from "@/styles.css?url";
import TimezoneTracker from "@/shared/i18n/TimezoneTracker";
import { AnalyticsProvider } from "@/analytics";
import { getCurrentLocale } from "@/shared/i18n/shared";
import { IntlProvider } from "next-intl";
import { fetchLocaleMessages } from "@/shared/i18n/fetchLocaleMessages";
import useSWR from "swr";
import { FlashProvider } from "@/flash";
import { fetchAuthState } from "@/modules/access/fetchAuthState";

export const Route = createRootRoute({
  // Move these to react query so we don't constantly refetch auth state
  beforeLoad: async () => {
    const auth = await fetchAuthState();
    return { auth };
  },
  loader: async () => {
    const locale = getCurrentLocale();
    return await fetchLocaleMessages({ data: { localeCode: locale.code } });
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
  const loaderData = Route.useLoaderData();

  const { data: messages } = useSWR(
    ["messages", locale.code],
    ([, localeCode]) => fetchLocaleMessages({ data: { localeCode } }),
    { fallbackData: loaderData, revalidateOnMount: false },
  );

  return (
    <html lang={locale.code} dir={locale.dir} className={locale.class}>
      <head>
        <HeadContent />
      </head>
      <body>
        <TimezoneTracker />
        <AnalyticsProvider id={process.env.VITE_FATHOM_ID} />
        <IntlProvider locale={locale.code} messages={messages}>
          <FlashProvider>
            <Outlet />
          </FlashProvider>
        </IntlProvider>
        <Scripts />
      </body>
    </html>
  );
}
