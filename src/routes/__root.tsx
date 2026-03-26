import {
  Outlet,
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import appCss from "@/styles.css?url";
import {
  getClientTimezone,
  TimezoneTracker,
} from "@/shared/i18n/clientTimezone";
import { AnalyticsProvider } from "@/analytics";
import { useCurrentLocale } from "@/shared/i18n/shared";
import { IntlProvider } from "use-intl";
import { getMessages } from "@/shared/i18n/messages";
import { FlashProvider } from "@/flash";
import { fetchAuthState } from "@/modules/access/fetchAuthState";
import { QueryClient } from "@tanstack/react-query";

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
    loader: async () => {
      const messages = await getMessages();

      return { messages };
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
    onError: console.log,
    component: RootLayout,
  },
);

function RootLayout() {
  const { messages } = Route.useLoaderData();
  const locale = useCurrentLocale();
  const tz = getClientTimezone();

  return (
    <html lang={locale?.code} dir={locale?.dir} className={locale?.class}>
      <head>
        <HeadContent />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <TimezoneTracker />
        <AnalyticsProvider id={process.env.VITE_FATHOM_ID} />
        <IntlProvider locale={locale?.code} messages={messages} timeZone={tz}>
          <FlashProvider>
            <Outlet />
          </FlashProvider>
        </IntlProvider>
        <Scripts />
      </body>
    </html>
  );
}
