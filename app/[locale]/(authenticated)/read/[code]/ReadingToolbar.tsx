"use client";

import Button from "@/app/components/Button";
import ComboboxInput from "@/app/components/ComboboxInput";
import FormLabel from "@/app/components/FormLabel";
import { Icon } from "@/app/components/Icon";
import TextInput from "@/app/components/TextInput";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { bookFirstChapterId, bookLastChapterId, decrementChapterId, incrementChapterId } from "@/app/verse-utils";

export interface TranslationToolbarProps {
    languages: { name: string; code: string }[];
}

export default function ReadingToolbar({
    languages
}: TranslationToolbarProps) {
    const t = useTranslations("ReadingToolbar");
    const { chapterId, code } = useParams<{ locale: string, code: string, chapterId: string }>()
    const router = useRouter()

    const [reference, setReference] = useState('')
    useEffect(() => {
        if (!chapterId) return setReference('')

        const bookId = parseInt(chapterId.slice(0, 2)) || 1
        const chapter = parseInt(chapterId.slice(2, 5)) || 1
        setReference(t('verse_reference', { bookId, chapter }))
    }, [chapterId, t])

    useEffect(() => {
        if (!chapterId) return

        const keydownCallback = async (e: globalThis.KeyboardEvent) => {
            if (e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
                switch (e.key) {
                    case 'ArrowUp': return router.push(`./${decrementChapterId(chapterId)}`);
                    case 'ArrowDown': return router.push(`./${incrementChapterId(chapterId)}`);
                }
            } else if (e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey) {
                switch (e.key) {
                    case 'Home': return router.push(`./${bookFirstChapterId(parseInt(chapterId.slice(0,2)))}`);
                    case 'End': return router.push(`./${bookLastChapterId(parseInt(chapterId.slice(0,2)))}`);
                }
            }
        };

        window.addEventListener('keydown', keydownCallback);
        return () => window.removeEventListener('keydown', keydownCallback);
    }, [router, chapterId]);

    function onSelectChapter(e: FormEvent) {
    }

    return (
        <div>
            <div className="flex items-center shadow-md dark:shadow-none dark:border-b dark:border-gray-500 px-6 md:px-8 py-4">
                <form onSubmit={onSelectChapter}>
                    <div className='me-16'>
                        <FormLabel htmlFor="chapter-reference">{t("chapter")}</FormLabel>
                        <input type="hidden" value={code} name="language" />
                        <div className="relative">
                            <TextInput
                                id="chapter-reference"
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
                                href={chapterId ? `./${decrementChapterId(chapterId)}` : '#'}
                            >
                                <Icon icon="arrow-up" />
                                <span className="sr-only">{t('previous_chapter')}</span>
                            </Button>
                            <Button
                                className="absolute end-1 top-1 w-7 !h-7"
                                variant="tertiary"
                                href={chapterId ? `./${incrementChapterId(chapterId)}` : '#'}
                                prefetch
                            >
                                <Icon icon="arrow-down" />
                                <span className="sr-only">{t('next_chapter')}</span>
                            </Button>
                        </div>
                    </div>
                </form>
                <div className="me-2">
                    <FormLabel htmlFor="target-language">{t("language")}</FormLabel>
                    <ComboboxInput
                        id="target-language"
                        items={languages.map((l) => ({ label: l.name, value: l.code }))}
                        value={code}
                        onChange={(code) => router.push(`../${code}/${chapterId}`)}
                        className="w-40"
                        autoComplete="off"
                    />
                </div>
            </div>
        </div>
    );
}

