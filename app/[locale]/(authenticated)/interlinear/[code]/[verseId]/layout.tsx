import Button from "@/app/components/Button"
import ComboboxInput from "@/app/components/ComboboxInput"
import FormLabel from "@/app/components/FormLabel"
import { Icon } from "@/app/components/Icon"
import TextInput from "@/app/components/TextInput"
import { query } from "@/app/db"
import { getLocale, getTranslations } from "next-intl/server"
import { notFound } from "next/navigation"
import { ReactNode } from "react"
import { changeInterlinearLocation } from "./actions"

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
    const t = await getTranslations("InterlinearLayout")
    const locale = await getLocale()

    const languages = await query<{ code: string, name: string }>(
        `SELECT code, name FROM "Language" ORDER BY name`,
        []
    )

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

    // TODO: load current users permissions
    const isTranslator = true
    const canAdministrate = true
    const canApproveAllGlosses = false
    const canLinkWords = false
    const canUnlinkWords = false

    return <div className="absolute w-full h-full flex flex-col flex-grow">
        <div className="flex items-center shadow-md dark:shadow-none dark:border-b dark:border-gray-500 px-6 md:px-8 py-4">
            {/* TODO: parse reference and redirect on form submit */}
            <form action={changeInterlinearLocation}>
                <input type="hidden" name="language" value={params.code} />
                <div className={isTranslator ? 'me-2' : 'me-16'}>
                    <FormLabel htmlFor="verse-reference">{t("toolbar.verse")}</FormLabel>
                    <div className="relative">
                        <TextInput
                            id="verse-reference"
                            className="pe-16 placeholder-current w-56"
                            name="reference"
                            autoComplete="off"
                            defaultValue={t('toolbar.verse_reference', { bookId: verse.bookId.toString(), chapter: verse.chapter, verse: verse.number })}
                            autosubmit
                            // TODO: move to client component, so we can modify focus behavior
                            // onFocus={(e) => e.target.select()}
                        />
                        <Button
                            className="absolute end-8 top-1 w-7 !h-7"
                            variant="tertiary"
                            href={data.prevVerse ? `./${data.prevVerse}` : ''}
                        >
                            <Icon icon="arrow-up" />
                            <span className="sr-only">{t('toolbar.previous_verse')}</span>
                        </Button>
                        <Button
                            className="absolute end-1 top-1 w-7 !h-7"
                            variant="tertiary"
                            href={data.nextVerse ? `./${data.nextVerse}` : ''}
                        >
                            <Icon icon="arrow-down" />
                            <span className="sr-only">{t('toolbar.next_verse')}</span>
                        </Button>
                    </div>
                </div>
            </form>
            {isTranslator && (
                <div className="me-16 pt-6">
                    <Button variant="tertiary">
                        {t('toolbar.next_unapproved')}
                        <Icon icon="arrow-right" className="ms-1 rtl:hidden" />
                        <Icon icon="arrow-left" className="ms-1 ltr:hidden" />
                    </Button>
                </div>
            )}
            <div className="me-2">
                <FormLabel htmlFor="target-language">{t("toolbar.language")}</FormLabel>
                {/* TODO: wrap in form in order to autosubmit and redirect to new language */}
                <ComboboxInput
                    id="target-language"
                    items={languages.rows.map((l) => ({ label: l.name, value: l.code }))}
                    value={params.code}
                    className="w-40"
                    autoComplete="off"
                />
            </div>
            {canAdministrate &&
                <div className="pt-6 me-16">
                    <Button variant="tertiary" href={`/${locale}/admin/languages/${params.code}/settings`}>
                        <Icon icon="sliders" className="me-1" />
                        {t('toolbar.manage_language')}
                    </Button>
                </div>
            }
            {isTranslator && (
                <div className="pt-6 flex items-center">
                    <Button
                        variant="tertiary"
                        disabled={!canApproveAllGlosses}
                    >
                        <Icon icon="check" className="me-1" />
                        {t('toolbar.approve_all')}
                    </Button>
                    <span className="mx-1 dark:text-gray-300" aria-hidden="true">
                        |
                    </span>
                    {!canUnlinkWords || canLinkWords ? (
                        <Button
                            variant="tertiary"
                            disabled={!canLinkWords}
                        >
                            <Icon icon="link" className="me-1" />
                            {t('toolbar.link_words')}
                        </Button>
                    ) : (
                        <Button variant="tertiary">
                            <Icon icon="unlink" className="me-1" />
                            {t('toolbar.unlink_words')}
                        </Button>
                    )}
                </div>
            )}
        </div>
        {children}
    </div>

}
