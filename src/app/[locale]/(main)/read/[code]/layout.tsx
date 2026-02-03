import { query } from "@/db";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { ReactNode } from "react";
import ReadingToolbar from "@/modules/study/react/ReadingToolbar";
import { NextIntlClientProvider } from "next-intl";

interface Props {
  children: ReactNode;
  params: Promise<{ code: string }>;
}

export default async function InterlinearLayout(props: Props) {
  const params = await props.params;

  const { children } = props;

  const messages = await getMessages();

  const [languages, currentLanguage] = await Promise.all([
    fetchLanguages(),
    fetchCurrentLanguage(params.code),
  ]);
  if (!currentLanguage) {
    notFound();
  }

  return (
    <NextIntlClientProvider
      messages={{
        ReadingToolbar: messages.ReadingToolbar,
        AudioDialog: messages.AudioDialog,
        SettingsMenu: messages.SettingsMenu,
      }}
    >
      <ReadingToolbar languages={languages}>{children}</ReadingToolbar>
    </NextIntlClientProvider>
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
    `SELECT code, english_name AS "englishName", local_name AS "localName" FROM language ORDER BY local_name`,
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
}

// TODO: cache this, it will only change when the language settings are changed or the user roles change on the language.
async function fetchCurrentLanguage(
  code: string,
): Promise<CurrentLanguage | undefined> {
  const result = await query<CurrentLanguage>(
    `
        SELECT
            code, english_name AS "englishName", local_name AS "localName", font, text_direction AS "textDirection"
        FROM language AS l
        WHERE code = $1
        `,
    [code],
  );
  return result.rows[0];
}
