import {
  Outlet,
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import appCss from "@/styles.css?url";
import { TimezoneTracker } from "@/shared/i18n/clientTimezone";
import { AnalyticsProvider } from "@/analytics";
import { getCurrentLocale } from "@/shared/i18n/shared";
import { IntlProvider } from "use-intl";
import { fetchLocaleMessages } from "@/shared/i18n/fetchLocaleMessages";
import { FlashProvider } from "@/flash";
import { fetchAuthState } from "@/modules/access/fetchAuthState";
import { QueryClient, useSuspenseQuery } from "@tanstack/react-query";

function localizationMessagesQuery(localeCode: string) {
  return {
    queryKey: ["messages", localeCode],
    queryFn: () => {
      return fetchLocaleMessages({ data: { localeCode } });
    },
  };
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    beforeLoad: async ({ context: { queryClient } }) => {
      const auth = await queryClient.ensureQueryData({
        queryKey: ["auth"],
        queryFn: () => fetchAuthState(),
        staleTime: Infinity,
      });

      return { auth };
    },
    loader: async ({ context: { queryClient } }) => {
      const locale = getCurrentLocale();
      await queryClient.ensureQueryData(localizationMessagesQuery(locale.code));
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
  },
);

function RootLayout() {
  const locale = getCurrentLocale();

  const { data: messages } = useSuspenseQuery({
    ...localizationMessagesQuery(locale.code),
    staleTime: Infinity,
  });

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
