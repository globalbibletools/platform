import { query } from "@/db";
import { getLocale, getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { ReactNode } from "react";
import TranslationToolbar from "./TranslationToolbar";
import { NextIntlClientProvider } from "next-intl";
import { TranslationClientStateProvider } from "./TranslationClientState";
import { verifySession } from "@/session";
import { getCurrentLanguageReadModel } from "@/modules/languages/read-models/getCurrentLanguageReadModel";

interface Props {
  children: ReactNode;
  params: { code: string };
}

export default async function InterlinearLayout({ children, params }: Props) {
  const messages = await getMessages();

  const session = await verifySession();
  if (!session) {
    notFound();
  }

  const [languages, currentLanguage] = await Promise.all([
    fetchLanguages(),
    getCurrentLanguageReadModel(params.code, session?.user.id),
  ]);

  return (
    <TranslationClientStateProvider>
      <NextIntlClientProvider
        messages={{
          TranslationToolbar: messages.TranslationToolbar,
        }}
      >
        <TranslationToolbar
          languages={languages}
          currentLanguage={currentLanguage}
          userRoles={session.user.roles}
        />
      </NextIntlClientProvider>
      {children}
    </TranslationClientStateProvider>
  );
}

interface Language {
  code: string;
  englishName: string;
  localName: string;
}

// TODO: cache this, it will only change when languages are added or reconfigured
async function fetchLanguages(): Promise<Language[]> {
  const result = await query<Language>(
    `SELECT code, english_name AS "englishName", local_name AS "localName" FROM language ORDER BY "englishName"`,
    [],
  );
  return result.rows;
}
