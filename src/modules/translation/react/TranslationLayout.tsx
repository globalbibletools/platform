import { query } from "@/db";
import { getLocale, getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { ReactNode } from "react";
import TranslationToolbar from "./TranslationToolbar";
import { NextIntlClientProvider } from "next-intl";
import { TranslationClientStateProvider } from "./TranslationClientState";
import { verifySession } from "@/session";

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
    fetchCurrentLanguage(params.code, session?.user.id),
  ]);

  return (
    <div className={`absolute w-full h-full flex flex-col flex-grow`}>
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
    </div>
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
    `SELECT code, english_name AS "englishName", local_name AS "localName", FROM language ORDER BY englishName`,
    [],
  );
  return result.rows;
}

interface CurrentLanguage {
  code: string;
  englishName: string;
  localName: string;
  font: string;
  textDirection: string;
  translationIds: string[];
  roles: string[];
}

// TODO: cache this, it will only change when the language settings are changed or the user roles change on the language.
async function fetchCurrentLanguage(
  code: string,
  userId?: string,
): Promise<CurrentLanguage | undefined> {
  const result = await query<CurrentLanguage>(
    `
        SELECT
            code, english_name AS "englishName", local_name AS "localName", font, text_direction AS "textDirection", translation_ids AS "translationIds",
            (
                SELECT COALESCE(JSON_AGG(r."role"), '[]') FROM language_member_role AS r
                WHERE r.language_id = l.id
                    AND r.user_id = $2
            ) AS roles
        FROM language AS l
        WHERE code = $1
        `,
    [code, userId],
  );
  return result.rows[0];
}
