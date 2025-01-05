"use client";

import Button from "@/components/Button";
import ComboboxInput from "@/components/ComboboxInput";
import FormLabel from "@/components/FormLabel";
import { Icon } from "@/components/Icon";
import TextInput from "@/components/TextInput";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { bookFirstChapterId, bookLastChapterId, decrementChapterId, incrementChapterId } from "@/verse-utils";
import { useReadingClientState } from "./ReadingClientState";
import SliderInput from "@/components/SliderInput";
import { changeChapter } from "./actions";
import AudioPlayer from "./AudioPlayer";

export interface TranslationToolbarProps {
    languages: { name: string; code: string }[];
}

export default function ReadingToolbar({
    languages
}: TranslationToolbarProps) {
    const t = useTranslations("ReadingToolbar");
    const { chapterId, code } = useParams<{ locale: string, code: string, chapterId: string }>()
    const router = useRouter()
    const { textSize, setAudioVerse, setTextSize } = useReadingClientState()

    const bookId = parseInt(chapterId.slice(0, 2)) || 1
    const chapter = parseInt(chapterId.slice(2, 5)) || 1

    const [reference, setReference] = useState('')
    useEffect(() => {
        setReference(t('verse_reference', { bookId, chapter }))
    }, [bookId, chapter])

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

    return (
        <div>
            <div className="flex items-center shadow-md dark:shadow-none dark:border-b dark:border-gray-500 px-6 md:px-8 py-4">
                <form action={changeChapter}>
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
                <div className="me-16">
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
                <div className="me-16">
                    <FormLabel htmlFor="text-size">{t("text_size")}</FormLabel>
                    <div className="h-[34px] flex items-center">
                    <SliderInput
                        id="text-size"
                        className="w-40"
                        min={1}
                        max={10}
                        step={1}
                        value={textSize}
                        onChange={(e) => setTextSize(e.target.valueAsNumber)}
                    />
                    </div>
                </div>
                <div className="me-2">
                    <FormLabel >{t("audio")}</FormLabel>
                    <AudioPlayer className="h-[34px]" chapterId={chapterId} onVerseChange={setAudioVerse} />
                </div>
            </div>
        </div>
    );
}

