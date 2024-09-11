"use client";

import Button from "@/app/components/Button";
import ComboboxInput from "@/app/components/ComboboxInput";
import FormLabel from "@/app/components/FormLabel";
import { Icon } from "@/app/components/Icon";
import TextInput from "@/app/components/TextInput";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { approveAll, changeInterlinearLocation, linkWords, redirectToUnapproved, unlinkPhrase } from "./actions";
import { bookFirstVerseId, bookLastVerseId, decrementVerseId, incrementVerseId } from "./verse-utils";
import { useTranslationClientState } from "./TranslationClientState";

export interface TranslationToolbarProps {
    languages: { name: string; code: string }[];
}

export default function TranslationToolbar({
    languages,
}: TranslationToolbarProps) {
    const t = useTranslations("TranslationToolbar");
    const { verseId, code } = useParams<{ code: string, verseId: string }>()
    const router = useRouter()

    const isTranslator = true;
    const isAdmin = true;

    const { selectedWords, focusedPhrase, clearSelectedWords } = useTranslationClientState()
    const canLinkWords = selectedWords.length > 1;
    const canUnlinkWords = (focusedPhrase?.wordIds.length ?? 0) > 1;

    const [reference, setReference] = useState('')
    useEffect(() => {
        const bookId = parseInt(verseId.slice(0, 2)) || 1
        const chapter = parseInt(verseId.slice(2, 5)) || 1
        const verse = parseInt(verseId.slice(5, 8)) || 1
        setReference(t('verse_reference', { bookId, chapter, verse }))
    }, [verseId, t])

    const navigateToNextUnapprovedVerse = useCallback(() => {
        const form = new FormData()
        form.set('verseId', verseId)
        form.set('code', code)
        redirectToUnapproved(form)
    }, [verseId, code])

    const approveAllGlosses = useCallback(() => {
        const inputs = document.querySelectorAll('[data-phrase]')
        const form = new FormData()
        form.set('code', code)
        let idx = 0
        inputs.forEach(input => {
            const phraseId = (input as HTMLInputElement).dataset.phrase
            const gloss = (input as HTMLInputElement).value

            if (phraseId && gloss) {
                form.set(`phrases[${idx}][id]`, phraseId)
                form.set(`phrases[${idx}][gloss]`, gloss)
                idx++
            }
        })

        approveAll(form)
    }, [code])

    const onLinkWords = useCallback(() => {
        const form = new FormData()
        form.set('code', code)
        selectedWords.forEach((wordId, i) => {
            form.set(`wordIds[${i}]`, wordId)
        })
        linkWords(form)
        clearSelectedWords()
    }, [code, selectedWords, clearSelectedWords])

    const onUnlinkWords = useCallback(() => {
        if (focusedPhrase) {
            const form = new FormData()
            form.set('code', code)
            form.set('phraseId', focusedPhrase.id.toString())
            unlinkPhrase(form)
        }
    }, [code, focusedPhrase])

    useEffect(() => {
        const keydownCallback = async (e: globalThis.KeyboardEvent) => {
            if (e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                switch (e.key) {
                    case 'a': return isTranslator && approveAllGlosses();
                    case 'n': return isTranslator && navigateToNextUnapprovedVerse();
                }
            } else if (e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
                switch (e.key) {
                    case 'l': return isTranslator && onLinkWords();
                    case 'u': return isTranslator && onUnlinkWords();
                    case 'ArrowUp': return router.push(`./${decrementVerseId(verseId)}`);
                    case 'ArrowDown': return router.push(`./${incrementVerseId(verseId)}`);
                }
            } else if (e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey) {
                switch (e.key) {
                    case 'Home': return router.push(`./${bookFirstVerseId(parseInt(verseId.slice(0,2)))}`);
                    case 'End': return router.push(`./${bookLastVerseId(parseInt(verseId.slice(0,2)))}`);
                }
            }
        };

        window.addEventListener('keydown', keydownCallback);
        return () => window.removeEventListener('keydown', keydownCallback);
    }, [isTranslator, navigateToNextUnapprovedVerse, approveAllGlosses, onLinkWords, onUnlinkWords, router, verseId]);

    return (
        <div className="flex items-center shadow-md dark:shadow-none dark:border-b dark:border-gray-500 px-6 md:px-8 py-4">
            <form action={changeInterlinearLocation}>
                <div className={isTranslator ? 'me-2' : 'me-16'}>
                    <FormLabel htmlFor="verse-reference">{t("verse")}</FormLabel>
                    <input type="hidden" value={code} name="language" />
                    <div className="relative">
                        <TextInput
                            id="verse-reference"
                            className="pe-16 placeholder-current w-56"
                            value={reference}
                            onChange={e => setReference(e.target.value)}
                            name="reference"
                            autoComplete="off"
                            onFocus={(e) => e.target.select()}
                        />
                        <Button
                            className="absolute end-8 top-1 w-7 !h-7"
                            variant="tertiary"
                            href={`./${decrementVerseId(verseId)}`}
                        >
                            <Icon icon="arrow-up" />
                            <span className="sr-only">{t('previous_verse')}</span>
                        </Button>
                        <Button
                            className="absolute end-1 top-1 w-7 !h-7"
                            variant="tertiary"
                            href={`./${incrementVerseId(verseId)}`}
                            prefetch
                        >
                            <Icon icon="arrow-down" />
                            <span className="sr-only">{t('next_verse')}</span>
                        </Button>
                    </div>
                </div>
            </form>
            {isTranslator && (
                <div className="me-16 pt-6">
                    <Button variant="tertiary" onClick={navigateToNextUnapprovedVerse}>
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
                    value={code}
                    onChange={(code) => router.push(`../${code}/${verseId}`)}
                    className="w-40"
                    autoComplete="off"
                />
            </div>
            {isAdmin && (
                <div className="pt-6 me-16">
                    <Button variant="tertiary" href={`/languages/${code}`}>
                        <Icon icon="sliders" className="me-1" />
                        {t('manage_language')}
                    </Button>
                </div>
            )}
            {isTranslator && (
                <div className="pt-6 flex items-center">
                    <Button
                        variant="tertiary"
                        onClick={approveAllGlosses}
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
                            onClick={onLinkWords}
                        >
                            <Icon icon="link" className="me-1" />
                            {t('link_words')}
                        </Button>
                    ) : (
                        <Button variant="tertiary" onClick={onUnlinkWords}>
                            <Icon icon="unlink" className="me-1" />
                            {t('unlink_words')}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}

