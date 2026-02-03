import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider, useMessages } from "next-intl";
import { getTranslations } from "next-intl/server";
import "@/styles.css";
import { headFontClass } from "@/fonts";
import languages from "@/i18n/languages.json";
import { FlashProvider } from "@/flash";
import { AnalyticsProvider } from "@/analytics";
import { routing } from "@/i18n/routing";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("RootLayout");
  return {
    title: t("app_name"),
  };
}

export default function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: { locale: string };
}>) {
  const { locale } = params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = useMessages();

  const language = languages[params.locale as keyof typeof languages];

  return (
    <html
      className={`${headFontClass} ${language.class}`}
      lang={params.locale}
      dir={language.dir}
    >
      <AnalyticsProvider id={process.env.FATHOM_ID} />
      <body>
        <NextIntlClientProvider
          messages={{
            Error: messages.Error,
            ModalView: messages.ModalView, // Needed for public error page
            Flash: messages.Flash,
            ConfirmModal: messages.ConfirmModal,
          }}
        >
          <FlashProvider>{children}</FlashProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
