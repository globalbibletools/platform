import { query } from "@/shared/db"
import { getMessages } from "next-intl/server"
import { notFound } from "next/navigation"
import { ReactNode } from "react"
import ReadingToolbar from "./ReadingToolbar"
import { NextIntlClientProvider } from "next-intl"
import { ReadingClientStateProvider } from "./ReadingClientState"

interface Props {
    children: ReactNode
    params: { code: string }
}

export default async function InterlinearLayout({ children, params }: Props) {
    const messages = await getMessages()

    const [languages, currentLanguage] = await Promise.all([
        fetchLanguages(),
        fetchCurrentLanguage(params.code)
    ])
    if (!currentLanguage) {
        notFound()
    }

    return <div className={`absolute w-full h-full flex flex-col flex-grow`}>
        <ReadingClientStateProvider>
            <NextIntlClientProvider messages={{ ReadingToolbar: messages.ReadingToolbar, AudioPlayer: messages.AudioPlayer }}>
                <ReadingToolbar
                    languages={languages}
                />
            </NextIntlClientProvider>
            {children}
        </ReadingClientStateProvider>
    </div>

}

interface Language {
    code: string
    name: string
}

// TODO: cache this, it will only change when languages are added or reconfigured
async function fetchLanguages(): Promise<Language[]> {
    const result = await query<Language>(
        `SELECT code, name FROM language ORDER BY name`,
        []
    )
    return result.rows
}

interface CurrentLanguage {
    code: string
    name: string
    font: string
    textDirection: string
}

// TODO: cache this, it will only change when the language settings are changed or the user roles change on the language.
async function fetchCurrentLanguage(code: string): Promise<CurrentLanguage | undefined> {
    const result = await query<CurrentLanguage>(
        `
        SELECT
            code, name, font, text_direction AS "textDirection"
        FROM language AS l
        WHERE code = $1
        `,
        [code]
    )
    return result.rows[0]
}

