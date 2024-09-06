import { query } from "@/app/db"
import { getLocale, getMessages } from "next-intl/server"
import { notFound } from "next/navigation"
import { ReactNode } from "react"
import TranslationToolbar from "./TranslationToolbar"
import {  NextIntlClientProvider } from "next-intl"

interface Props {
    children: ReactNode
    params: { code: string, verseId: string }
}

interface VerseQueryResult {
    verse: { bookId: number, chapter: number, number: number }
    prevVerse?: string
    nextVerse?: string
}

export default async function InterlinearLayout({ children, params }: Props) {
    const messages = await getMessages()
    const locale = await getLocale()

    const languages = await query<{ code: string, name: string, font: string }>(
        `SELECT code, name, font FROM "Language" ORDER BY name`,
        []
    )
    const selectedLanguage = languages.rows.find(l => l.code === params.code)
    if (!selectedLanguage) {
        notFound()
    }

    /*
    const result = await query<VerseQueryResult>(
        `SELECT
            JSON_BUILD_OBJECT(
                'bookId', v."bookId",
                'chapter', v.chapter,
                'number', v.number
            ) AS verse,
            (SELECT id FROM "Verse" WHERE id > $1 ORDER BY id LIMIT 1) AS "nextVerse",
            (SELECT id FROM "Verse" WHERE id < $1 ORDER BY id DESC LIMIT 1) AS "prevVerse"
        FROM "Verse" AS v
        WHERE v.id = $1`,
        [params.verseId]
    )
    const data = result.rows[0]
    if (!data) {
        notFound()
    }
    const { verse } = data
    */


    return <div className={`absolute w-full h-full flex flex-col flex-grow`}>
        <NextIntlClientProvider messages={{ TranslationToolbar: messages.TranslationToolbar }}>
            <TranslationToolbar
                languages={languages.rows}
            />
        </NextIntlClientProvider>
        {children}
    </div>

}
