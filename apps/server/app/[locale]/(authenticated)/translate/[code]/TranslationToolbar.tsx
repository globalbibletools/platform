"use client";

import Button from "@/app/components/Button";
import ComboboxInput from "@/app/components/ComboboxInput";
import FormLabel from "@/app/components/FormLabel";
import { Icon } from "@/app/components/Icon";
import TextInput from "@/app/components/TextInput";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { approveAll, changeInterlinearLocation, linkWords, redirectToUnapproved, sanityCheck, unlinkPhrase } from "./actions";
import { bookFirstVerseId, bookLastVerseId, decrementVerseId, incrementVerseId } from "@/app/verse-utils";
import { useTranslationClientState } from "./TranslationClientState";
import TranslationProgressBar from "./TranslationProgressBar";
import { useSWRConfig } from "swr";
import { useFlash } from "@/app/flash";
import ServerAction from "@/app/components/ServerAction";

export interface TranslationToolbarProps {
    languages: { name: string; code: string }[];
    currentLanguage?: { roles: string [] };
    userRoles: string[]
}

export default function TranslationToolbar({
    languages,
    currentLanguage,
    userRoles
}: TranslationToolbarProps) {
    const t = useTranslations("TranslationToolbar");
    const { verseId, code, locale } = useParams<{ locale: string, code: string, verseId: string }>()
    const router = useRouter()
    const { mutate } = useSWRConfig()
    const flash = useFlash()

    const isTranslator = !!currentLanguage?.roles.includes('TRANSLATOR');
    const isLanguageAdmin = !!currentLanguage?.roles.includes('ADMIN');
    const isPlatformAdmin = userRoles.includes('ADMIN')

    const { selectedWords, focusedPhrase, clearSelectedWords, setBacktranslations } = useTranslationClientState()
    const canLinkWords = selectedWords.length > 1;
    const canUnlinkWords = (focusedPhrase?.wordIds.length ?? 0) > 1;

    const [reference, setReference] = useState('')
    useEffect(() => {
        if (!verseId) return setReference('')

        const bookId = parseInt(verseId.slice(0, 2)) || 1
        const chapter = parseInt(verseId.slice(2, 5)) || 1
        const verse = parseInt(verseId.slice(5, 8)) || 1
        setReference(t('verse_reference', { bookId, chapter, verse }))
    }, [verseId, t])

    const navigateToNextUnapprovedVerse = useCallback(async () => {
        const form = new FormData()
        form.set('verseId', verseId)
        form.set('code', code)
        const error = await redirectToUnapproved(form)
        if (error) {
            flash.success(error)
        }
    }, [verseId, code])

    const approveAllGlosses = useCallback(async () => {
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

        await approveAll(form)
        await mutate({
            type: 'book-progress',
            bookId: parseInt(verseId.slice(0, 2)),
            locale,
            code
        })
    }, [code, mutate, locale, verseId])

    const onLinkWords = useCallback(async () => {
        const form = new FormData()
        form.set('code', code)
        selectedWords.forEach((wordId, i) => {
            form.set(`wordIds[${i}]`, wordId)
        })
        clearSelectedWords()
        await linkWords(form)
        await mutate({
            type: 'book-progress',
            bookId: parseInt(verseId.slice(0, 2)),
            locale,
            code
        })
    }, [code, selectedWords, clearSelectedWords, locale, mutate, verseId])

    const onUnlinkWords = useCallback(async () => {
        if (focusedPhrase) {
            const form = new FormData()
            form.set('code', code)
            form.set('phraseId', focusedPhrase.id.toString())
            unlinkPhrase(form)
            await mutate({
                type: 'book-progress',
                bookId: parseInt(verseId.slice(0, 2)),
                locale,
                code
            })
        }
    }, [code, focusedPhrase, verseId, locale, mutate])

    const [runningSanityCheck, setRunningSanityCheck] = useState(false)
    const onSanityCheck = useCallback(async () => {
        const form = new FormData()
        form.set('code', code)
        form.set('verseId', verseId)
        setRunningSanityCheck(true)
        const result = await sanityCheck({ state: 'idle' }, form)
        if (result.state === 'error' && result.error) {
            flash.error(result.error)
        } else if (result.state === 'success' && result.data) {
            setBacktranslations(result.data)
        }
        setRunningSanityCheck(false)
    }, [code, verseId])

    useEffect(() => {
        if (!verseId) return

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
        <div>
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
                                href={verseId ? `./${decrementVerseId(verseId)}` : '#'}
                            >
                                <Icon icon="arrow-up" />
                                <span className="sr-only">{t('previous_verse')}</span>
                            </Button>
                            <Button
                                className="absolute end-1 top-1 w-7 !h-7"
                                variant="tertiary"
                                href={verseId ? `./${incrementVerseId(verseId)}` : '#'}
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
                        <Button variant="tertiary" disabled={!verseId} onClick={navigateToNextUnapprovedVerse}>
                            {t('next_unapproved')}
                            <Icon icon="arrow-right" className="ms-1 rtl:hidden" />
                            <Icon icon="arrow-left" className="ms-1 ltr:hidden" />
                        </Button>
                    </div>
                )}
                <div className="me-16">
                    <FormLabel htmlFor="target-language">{t("language")}</FormLabel>
                    <div className="flex">
                        <ComboboxInput
                            id="target-language"
                            items={languages.map((l) => ({ label: l.name, value: l.code }))}
                            value={code}
                            onChange={(code) => router.push(`../${code}/${verseId}`)}
                            className="w-40"
                            autoComplete="off"
                        />
                        {isLanguageAdmin && (
                            <Button className="ms-2" variant="tertiary" href={`/admin/languages/${code}/settings`}>
                                <Icon icon="sliders" className="me-1" />
                                {t('manage_language')}
                            </Button>
                        )}
                    </div>
                </div>
                    <div className="pt-6 flex items-center">
                        {isTranslator && (<>
                            <Button
                                variant="tertiary"
                                disabled={!verseId}
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
                                    disabled={!canLinkWords || !verseId}
                                    onClick={onLinkWords}
                                >
                                    <Icon icon="link" className="me-1" />
                                    {t('link_words')}
                                </Button>
                            ) : (
                                <Button variant="tertiary" disabled={!verseId} onClick={onUnlinkWords}>
                                    <Icon icon="unlink" className="me-1" />
                                    {t('unlink_words')}
                                </Button>
                            )}
                        </>)}
                        {
                            isPlatformAdmin && <>
                                {isTranslator &&
                                    <span className="mx-1 dark:text-gray-300" aria-hidden="true">
                                        |
                                    </span>
                                }
                                <Button variant="tertiary" disabled={!verseId} onClick={onSanityCheck}>
                                    <Icon icon={runningSanityCheck ? "arrows-rotate" : "clipboard-check"} className="me-1" />
                                    {t('sanity_check')}
                                </Button>
                            </>
                        }
                    </div>
            </div>
            { verseId && <TranslationProgressBar /> }
        </div>
    );
}

