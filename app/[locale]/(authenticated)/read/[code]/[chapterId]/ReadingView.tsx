"use client";

import { isOldTestament } from "@/app/verse-utils";
import { Fragment, MouseEvent, useEffect, useState } from "react";
import { useFloating, autoUpdate } from '@floating-ui/react-dom';
import { createPortal } from "react-dom";

interface VerseWord {
    id: string
    text: string
    gloss?: string
    linkedWords?: string[]
}

interface Verse {
    number: number
    words: VerseWord[]
}

export interface ReadingViewProps {
    chapterId: string
    verses: Verse[]
}

export default function ReadingView({ chapterId, verses }: ReadingViewProps) {
    const isOT = isOldTestament(chapterId + '001');

    const popover = usePopover();
    const linkedWords = popover.selectedWord?.word.linkedWords ?? [];

    return <>
        <div className="flex flex-col flex-grow w-full min-h-0 lg:flex-row">
            <div className="flex flex-col max-h-full min-h-0 gap-8 overflow-auto grow pt-8 pb-10 px-6">
                <div
                    className={`font-mixed mx-auto max-w-[960px] leading-loose ${isOT ? 'text-right' : 'text-left'
                        }`}
                    dir={isOT ? 'rtl' : 'ltr'}
                >
                    {verses.flatMap((verse) => {
                        const words = verse.words.map((word, i) => (
                            <Fragment key={word.id}>
                                <span
                                    className={`
                                        ${i === verse.words.length - 1 ? 'me-1' : ''}
                                        ${(linkedWords.length > 0 &&
                                            popover.selectedWord?.word.id === word.id) ||
                                            linkedWords.includes(word.id)
                                            ? 'bg-green-200 dark:bg-gray-600 rounded-sm'
                                            : ''
                                        }
                                    `}
                                    onClick={(e) => popover.onWordClick(e, word)}
                                    onMouseEnter={(e) =>
                                        popover.onWordMouseEnter(e, word)
                                    }
                                    onMouseLeave={(e) => popover.onWordMouseLeave(e)}
                                >
                                    {word.text}
                                </span>
                                {!word.text.endsWith('־') && ' '}
                            </Fragment>
                        ));
                        words.unshift(
                            <span className={'font-sans text-xs'}>
                                {verse.number}&nbsp;
                            </span>
                        );
                        return words;
                    })}
                </div>
            </div>
        </div>
        {popover.selectedWord &&
            createPortal(
                <div
                    className="bg-brown-100 dark:bg-gray-700 rounded-sm border border-gray-300 dark:border-gray-600 shadow-sm dark:shadow-none px-1 font-bold"
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

