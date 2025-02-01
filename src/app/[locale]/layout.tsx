import type { Metadata } from "next";
import { config } from "@fortawesome/fontawesome-svg-core";
import { NextIntlClientProvider, useMessages } from "next-intl";
import { getTranslations } from "next-intl/server";
import "@fortawesome/fontawesome-svg-core/styles.css";
import "@/globals.css";
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

config.autoAddCss = false;

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
      <body className="dark:bg-gray-800 dark:text-gray-200">
        <NextIntlClientProvider
          messages={{
            DocumentTitle: messages.DocumentTitle,
            Error: messages.Error,
            ModalView: messages.ModalView, // Needed for public error page
            Flash: messages.Flash,
            ConfirmModal: messages.ConfirmModal,
            Form: messages.Form, // Needed for common error messages in form responses
          }}
        >
          <FlashProvider>{children}</FlashProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
