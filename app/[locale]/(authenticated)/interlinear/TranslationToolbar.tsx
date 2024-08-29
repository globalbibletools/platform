"use client";

import Button from "@/app/components/Button"
import ComboboxInput from "@/app/components/ComboboxInput"
import FormLabel from "@/app/components/FormLabel"
import { Icon } from "@/app/components/Icon"
import TextInput from "@/app/components/TextInput"
import { useTranslations } from "next-intl"
import { useParams } from "next/navigation";

export interface TranslationToolbarProps {
    languages: { code: string; name: string; }[]
}

export default function TranslationToolbar({ languages }: TranslationToolbarProps) {
    const params = useParams<{ code: string, verseId: string }>()

    const locale = ''
    const data = { nextVerse: '', prevVerse: '' }
    const verse = {
        bookId: parseInt(params.verseId.slice(0, 2)) || 1,
        chapter: parseInt(params.verseId.slice(2, 5)) || 1,
        number: parseInt(params.verseId.slice(5, 8)) || 1
    }

    const t = useTranslations("TranslationToolbar")

    // TODO: load current users permissions
    const isTranslator = true
    const canAdministrate = true
    const canApproveAllGlosses = false
    const canLinkWords = false
    const canUnlinkWords = false

    return <div className="flex items-center shadow-md dark:shadow-none dark:border-b dark:border-gray-500 px-6 md:px-8 py-4">
        <div className={isTranslator ? 'me-2' : 'me-16'}>
            <FormLabel htmlFor="verse-reference">{t("verse")}</FormLabel>
            <div className="relative">
                <form onSubmit={() => {}}>
                    <TextInput
                        id="verse-reference"
                        className="pe-16 placeholder-current w-56"
                        name="reference"
                        autoComplete="off"
                        value={t('verse_reference', { bookId: verse.bookId.toString(), chapter: verse.chapter, verse: verse.number })}
                        onFocus={(e) => e.target.select()}
                    />
                </form>
                <Button
                    className="absolute end-8 top-1 w-7 !h-7"
                    variant="tertiary"
                    href={data.prevVerse ? `./${data.prevVerse}` : ''}
                >
                    <Icon icon="arrow-up" />
                    <span className="sr-only">{t('previous_verse')}</span>
                </Button>
                <Button
                    className="absolute end-1 top-1 w-7 !h-7"
                    variant="tertiary"
                    href={data.nextVerse ? `./${data.nextVerse}` : ''}
                >
                    <Icon icon="arrow-down" />
                    <span className="sr-only">{t('next_verse')}</span>
                </Button>
            </div>
        </div>
        {isTranslator && (
            <div className="me-16 pt-6">
                <Button variant="tertiary">
                    {t('next_unapproved')}
                    <Icon icon="arrow-right" className="ms-1 rtl:hidden" />
                    <Icon icon="arrow-left" className="ms-1 ltr:hidden" />
                </Button>
            </div>
        )}
        <div className="me-2">
            <FormLabel htmlFor="target-language">{t("language")}</FormLabel>
            <ComboboxInput
                id="target-language"
                items={languages.map((l) => ({ label: l.name, value: l.code }))}
                name="language"
                value={params.code}
                className="w-40"
                autoComplete="off"
                onChange={() => {}}
            />
        </div>
        {canAdministrate &&
            <div className="pt-6 me-16">
                <Button variant="tertiary" href={`/${locale}/admin/languages/${params.code}/settings`}>
                    <Icon icon="sliders" className="me-1" />
                    {t('manage_language')}
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
                    {t('approve_all')}
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
                        {t('link_words')}
                    </Button>
                ) : (
                    <Button variant="tertiary">
                        <Icon icon="unlink" className="me-1" />
                        {t('unlink_words')}
                    </Button>
                )}
            </div>
        )}
    </div>
}
