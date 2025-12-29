import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import ClientReadingView from "./ClientReadingView";
import { query } from "@/db";
import { notFound } from "next/navigation";
import readingQueryService from "../data-access/ReadingQueryService";

export interface ReadingPageProps {
  params: { chapterId: string; code: string };
}

export default async function serverReadingView({ params }: ReadingPageProps) {
  const messages = await getMessages();

  const bookId = parseInt(params.chapterId.slice(0, 2)) || 1;
  const chapterNumber = parseInt(params.chapterId.slice(2, 5)) || 1;
  const [chapterVerses, currentLanguage] = await Promise.all([
    readingQueryService.fetchChapterVerses(bookId, chapterNumber, params.code),
    fetchCurrentLanguage(params.code),
  ]);

  if (!currentLanguage) {
    notFound();
  }

  return (
    <NextIntlClientProvider
      messages={{
        WordDetails: messages.WordDetails,
        VersesPreview: messages.VersesPreview,
      }}
    >
      <ClientReadingView
        chapterId={params.chapterId}
        language={currentLanguage}
        verses={chapterVerses}
      />
    </NextIntlClientProvider>
  );
}

interface CurrentLanguage {
  code: string;
  name: string;
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
            code, name, font, text_direction AS "textDirection"
        FROM language AS l
        WHERE code = $1
        `,
    [code],
  );
  return result.rows[0];
}
