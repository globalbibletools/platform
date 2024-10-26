import type { Metadata } from "next";
import { config } from '@fortawesome/fontawesome-svg-core'
import { NextIntlClientProvider, useMessages } from "next-intl";
import { getTranslations } from "next-intl/server";

import '@fortawesome/fontawesome-svg-core/styles.css'
import "../globals.css";
import { headFontClass } from "../fonts";
import languages from "../../languages.json";
import { FlashProvider } from "../flash";
import Script from "next/script";
 
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("RootLayout")
  return {
    title: t("app_name")
  }
}

config.autoAddCss = false

export default function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: { locale: string }
}>) {
    const messages = useMessages()

    const language = languages[params.locale as keyof typeof languages]

  return (
    <html
        className={`${headFontClass} ${language.class}`}
        lang={params.locale}
        dir={language.dir}
    >
      <body className="dark:bg-gray-800 dark:text-gray-200">
        <NextIntlClientProvider
            messages={{
                DocumentTitle: messages.DocumentTitle,
                Error: messages.Error,
                ModalView: messages.ModalView, // Needed for public error page
                Flash: messages.Flash
            }}
        >
            <FlashProvider>
                {children}
            </FlashProvider>
        </NextIntlClientProvider>
        {
            process.env.NODE_ENV === 'production' &&
                <Script id="show-banner">
                  {`
                    var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
                    (function(){
                    var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
                    s1.async=true;
                    s1.src='https://embed.tawk.to/671d701f4304e3196ad8d17a/1ib5frv2r';
                    s1.charset='UTF-8';
                    s1.setAttribute('crossorigin','*');
                    s0.parentNode.insertBefore(s1,s0);
                    })();
                  `}
                </Script>
        }
      </body>
    </html>
  );
}
