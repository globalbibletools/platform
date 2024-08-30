import { query } from "@/app/db"
import ClientTranslationView from "./ClientView"
import { NextIntlClientProvider } from "next-intl"
import { getMessages } from "next-intl/server"
import { TranslationToolbar } from "./TranslationToolbar"

interface Props {
    params: { code: string, verseId: string }
}

export default async function InterlinearView({ params }: Props) {
    const messages = await getMessages()

    const languages = await query<{ code: string, name: string }>(
        `SELECT code, name FROM "Language" ORDER BY name`,
        []
    )

    return <NextIntlClientProvider messages={{ TranslationToolbar: messages.TranslationToolbar }}>
            <ClientTranslationView languages={languages.rows} />
        </NextIntlClientProvider>
}
