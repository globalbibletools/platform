import type { Metadata } from "next";
import { NextIntlClientProvider, useMessages } from "next-intl";
import { getTranslations } from "next-intl/server";
import "@/styles.css";
import { headFontClass } from "@/fonts";
import languages from "../../languages.json";
import { FlashProvider } from "@/flash";
import { AnalyticsProvider } from "@/analytics";

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
            DocumentTitle: messages.DocumentTitle,
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
