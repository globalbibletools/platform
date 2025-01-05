"use client";

import { isOldTestament } from "@/app/verse-utils";
import { Fragment, MouseEvent, useEffect, useRef, useState } from "react";
import { useFloating, autoUpdate } from '@floating-ui/react-dom';
import { createPortal } from "react-dom";
import ReadingSidebar, { ReadingSidebarRef } from "./ReadingSidebar";
import { useReadingClientState } from "../ReadingClientState";

interface VerseWord {
    id: string
    text: string
    gloss?: string
    linkedWords?: string[]
    lemma: string
    grammar: string
    resource?: {
        name: string
        entry: string
    }
    footnote?: string
}

interface Verse {
    id: string
    number: number
    words: VerseWord[]
}

interface Language {
    font: string,
    textDirection: string
    code: string
}

export interface ReadingViewProps {
    chapterId: string
    language: Language
    verses: Verse[]
}

const textSizeMap: Record<number, string> = {
    1: 'text-xs',
    2: 'text-sm',
    3: 'text-base',
    4: 'text-lg',
    5: 'text-xl',
    6: 'text-2xl',
    7: 'text-3xl',
    8: 'text-4xl',
    9: 'text-5xl',
    10: 'text-6xl',
    11: 'text-7xl',
    12: 'text-8xl',
    13: 'text-9xl',
}

export default function ReadingView({ chapterId, language, verses }: ReadingViewProps) {
    const isOT = isOldTestament(chapterId + '001');

    const popover = usePopover();
    const linkedWords = popover.selectedWord?.word.linkedWords ?? [];

    const [showSidebar, setShowSidebar] = useState(false)
    const [sidebarWord, setSidebarWord] = useState(verses[0].words[0])
    useEffect(() => {
        setSidebarWord(verses[0].words[0])
    }, [verses])

    const sidebarRef = useRef<ReadingSidebarRef>(null)

    const { textSize, audioVerse } = useReadingClientState()

    return <>
        <div className="flex flex-col flex-grow lg:justify-center w-full min-h-0 lg:flex-row">
            <div
                className={`
                    max-h-full min-h-0 overflow-auto pt-8 pb-24 px-6
                    font-mixed max-w-[960px] leading-loose
                    ${textSizeMap[textSize]}
                    ${isOT ? 'text-right' : 'text-left'}
                `}
                dir={isOT ? 'rtl' : 'ltr'}
            >
                {verses.flatMap((verse) => {
                    const words = verse.words.map((word, i) => (
                        <Fragment key={word.id}>
                            <span
                                className={`
                                    cursor-pointer
                                    ${i === verse.words.length - 1 ? 'me-1' : ''}
                                    ${(linkedWords.length > 0 &&
                                        popover.selectedWord?.word.id === word.id) ||
                                        linkedWords.includes(word.id)
                                        ? 'bg-green-200 dark:bg-gray-600 rounded-sm'
                                        : ''
                                    }
                                `}
                                onDoubleClick={(e) => {
                                    setShowSidebar(true)
                                }}
                                onClick={(e) => {
                                    setSidebarWord(word)
                                    popover.onWordClick(e, word)
                                }}
                            >
                                {word.text}
                            </span>
                            {!word.text.endsWith('־') && ' '}
                        </Fragment>
                    ));
                    words.unshift(
                        <span
                            key={`verse-${verse.number}`}
                            className={'font-sans text-xs cursor-pointer'}
                            // Allows audio player to start playing at this verse when clicked
                            data-verse-number={verse.number}
                        >
                            {verse.number}&nbsp;
                        </span>
                    );
                    return <span
                        key={verse.id}
                        className={`
                            rounded
                            ${audioVerse === verse.id ? 'bg-green-200 dark:bg-gray-600' : ''}
                        `}
                    >
                        {words}
                    </span>;
                })}
            </div>
            {showSidebar && (
                <ReadingSidebar
                    ref={sidebarRef}
                    language={language}
                    word={sidebarWord}
                    className="h-[320px] lg:h-auto lg:w-1/3 lg:min-w-[320px] lg:max-w-[480px] mt-8 mb-10 mx-6 lg:ms-0 lg:me-8"
                    onClose={() => setShowSidebar(false)}
                />
            )}
        </div>
        {popover.selectedWord &&
            createPortal(
                <div
                    className={`
                        bg-brown-100 dark:bg-gray-700 rounded-sm border border-gray-300 dark:border-gray-600 shadow-sm dark:shadow-none px-1 font-bold
                        ${textSizeMap[textSize]}
                    `}
                    dir={language.textDirection}
                    ref={popover.refs.setFloating}
                    style={popover.floatingStyles}
                >
                    {popover.selectedWord.word.gloss ?? '-'}
                </div>,
                document.body
            )}
    </>
}

function usePopover(onClose?: () => void) {
    const [selectedWord, selectWord] = useState<{
        word: VerseWord;
        mode: 'hover' | 'click';
    }>();

    const { refs, elements, floatingStyles } = useFloating({
        strategy: 'fixed',
        placement: 'top',
        whileElementsMounted: autoUpdate,
    });

    useEffect(() => {
        if (!elements.reference) return;

        function handler(e: Event) {
            const target = e.target instanceof HTMLElement ? e.target : null;
            const popover = refs.floating.current;
            const reference =
                refs.reference.current instanceof HTMLElement
                    ? refs.reference.current
                    : null;
            if (
                target !== popover &&
                !popover?.contains(target) &&
                target !== reference &&
                !popover?.contains(reference)
            ) {
                selectWord(undefined);
                refs.setReference(null);
            }
        }

        // This prevents the click event from attaching to soon and immediately closing the popover.
        setTimeout(() => {
            window.addEventListener('click', handler);
        });
        return () => {
            setTimeout(() => window.removeEventListener('click', handler));
        };
    }, [refs, elements.reference, onClose]);

    function onWordClick(e: MouseEvent<HTMLSpanElement>, word: VerseWord) {
        refs.setReference(e.currentTarget);
        selectWord({ word, mode: 'click' });
    }
    function onWordMouseEnter(e: MouseEvent<HTMLSpanElement>, word: VerseWord) {
        refs.setReference(e.currentTarget);
        selectWord({ word, mode: 'hover' });
    }
    function onWordMouseLeave(e: MouseEvent<HTMLSpanElement>) {
        refs.setReference(e.currentTarget);
        if (selectedWord?.mode === 'hover') {
            selectWord(undefined);
        }
    }

    return {
        refs,
        floatingStyles,
        onWordClick,
        onWordMouseEnter,
        onWordMouseLeave,
        selectedWord,
    };
}

