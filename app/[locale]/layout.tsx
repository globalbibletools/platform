import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import { config } from '@fortawesome/fontawesome-svg-core'
import { NextIntlClientProvider, useMessages } from "next-intl";
import { getTranslations } from "next-intl/server";

import '@fortawesome/fontawesome-svg-core/styles.css'
import "../globals.css";
 
const noto_sans = Noto_Sans({
    subsets: ["latin"],
    display: 'swap',
    variable: "--font-noto-sans"
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("RootLayout")
  return {
    title: t("app_name")
  }
}

config.autoAddCss = false

const RTL_LOCALES = ['ar']

export default function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: { locale: string }
}>) {
    const messages = useMessages()
  return (
    <html
        className={noto_sans.variable}
        lang={params.locale}
        dir={RTL_LOCALES.includes(params.locale) ? 'rtl' : 'ltr'}
    >
      <body>
        <NextIntlClientProvider
            messages={{
                DocumentTitle: messages.DocumentTitle
            }}
        >
            {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
