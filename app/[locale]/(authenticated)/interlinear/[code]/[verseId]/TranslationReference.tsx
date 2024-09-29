import { fontMap } from "@/app/fonts"
import useSWR from "swr"
import { parseVerseId } from "../verse-utils"
import { bookKeys } from "@/data/book-keys"
import { BibleClient } from "@gracious.tech/fetch-client"

export interface TranslationReferenceProps {
    verseId: string
    language: { textDirection: string, font: string, translationIds: string[] }
}

const client = new BibleClient()

export default function TranslationReference({ verseId, language }: TranslationReferenceProps) {
    const { data } = useTranslationQuery(verseId, language.translationIds)

    if (!data) {
        return
    }

    return <p
        className="mx-2 text-base"
        dir={language.textDirection}
        style={{
            fontFamily: fontMap[language.font]
        }}
    >
        <span className="text-sm font-bold me-2">
            {data.name}
        </span>
        <span>{data.translation}</span>
    </p>
}

function useTranslationQuery(verseId: string, translationIds: string[]) {
    return useSWR(['verse-translation', verseId, translationIds], async ([, verseId, translationIds]) => {
        const { bookId, chapterNumber, verseNumber } = parseVerseId(verseId)
        const bookKey = bookKeys[bookId - 1].toLowerCase();
        const collection = await client.fetch_collection();
        const translations = collection.get_translations();
        for (const translationId of translationIds) {
            try {
                const book = await collection.fetch_book(translationId, bookKey, 'txt');
                const verseTranslation = book.get_verse(chapterNumber, verseNumber, {
                    attribute: false,
                    verse_nums: false,
                    headings: false,
                    notes: false,
                });
                const translation = translations.find((t) => t.id === translationId);
                if (translation) {
                    const { name_local, name_english } = translation;
                    return {
                        name: name_local ? name_local : name_english,
                        translation: verseTranslation,
                    };
                }
            } catch (e) {
                console.log(e);
                continue;
            }
        }
        return
    })
}
