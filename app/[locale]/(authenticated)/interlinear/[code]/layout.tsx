import { query } from "@/app/db"
import { getLocale, getMessages } from "next-intl/server"
import { notFound } from "next/navigation"
import { ReactNode } from "react"
import TranslationToolbar from "./TranslationToolbar"
import {  NextIntlClientProvider } from "next-intl"
import { TranslationClientStateProvider } from "./TranslationClientState"
import { verifySession } from "@/app/session"

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

    const session = await verifySession()

    const [languages, currentLanguage] = await Promise.all([
        fetchLanguages(),
        fetchCurrentLanguage(params.code, session?.user.id)
    ])
    if (!currentLanguage) {
        notFound()
    }

    return <div className={`absolute w-full h-full flex flex-col flex-grow`}>
        <TranslationClientStateProvider verseId={params.verseId}>
            <NextIntlClientProvider messages={{ TranslationToolbar: messages.TranslationToolbar }}>
                <TranslationToolbar
                    languages={languages}
                    currentLanguage={currentLanguage}
                />
            </NextIntlClientProvider>
            {children}
        </TranslationClientStateProvider>
    </div>

}

interface Language {
    code: string
    name: string
}

// TODO: cache this, it will only change when languages are added or reconfigured
async function fetchLanguages(): Promise<Language[]> {
    const result = await query<Language>(
        `SELECT code, name FROM "Language" ORDER BY name`,
        []
    )
    return result.rows
}

interface CurrentLanguage {
    code: string
    name: string
    font: string
    textDirection: string
    roles: string[]
}

// TODO: cache this, it will only change when the language settings are changed or the user roles change on the language.
export async function fetchCurrentLanguage(code: string, userId?: string): Promise<CurrentLanguage | undefined> {
    const result = await query<CurrentLanguage>(
        `
        SELECT
            code, name, font, "textDirection",
            (
                SELECT COALESCE(JSON_AGG(r."role"), '[]') FROM "LanguageMemberRole" AS r
                WHERE r."languageId" = l.id
                    AND r."userId" = $2
            ) AS roles
        FROM "Language" AS l
        WHERE code = $1
        `,
        [code, userId]
    )
    return result.rows[0]
}
