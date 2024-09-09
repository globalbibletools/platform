"use client";

import { useEffect, useRef, useState } from "react";
import TranslateWord from "./TranslateWord"
import TranslationSidebar, { TranslationSidebarRef } from "./TranslationSidebar";
import { useTranslationClientState } from "../TranslationClientState";

interface Word {
    id: string,
    text: string,
    referenceGloss?: string,
    suggestions: string[],
    machineGloss?: string,
    lemma: string,
    grammar: string,
    resource?: { name: string, entry: string }
}
interface Phrase {
    id: number,
    wordIds: string[],
    gloss?: { text: string, state: string },
    translatorNote?: { authorName: string, timestamp: string, content: string },
    footnote?: { authorName: string, timestamp: string, content: string }
}

export interface TranslationViewProps {
    verseId: string
    words: Word[]
    phrases: Phrase[]
    language: {
        code: string
        font: string
        textDirection: string
    }
}

export default function TranslateView({ verseId, words, phrases, language }: TranslationViewProps) {
    const isHebrew = parseInt(verseId.slice(0, 2)) < 40

    const [showSidebar, setShowSidebar] = useState(true)
    const [sidebarWord, setSidebarWord] = useState(words[0])
    const sidebarPhrase = phrases.find(ph => ph.wordIds.includes(sidebarWord.id))
    const lastVerse = useRef(verseId)
    useEffect(() => {
        if (lastVerse.current !== verseId) {
            setSidebarWord(words[0])
            lastVerse.current = verseId
        }
    }, [words, verseId])

    const sidebarRef = useRef<TranslationSidebarRef>(null)

    const { selectedWords, focusedPhrase, selectWord, focusPhrase } = useTranslationClientState();

    useEffect(() => {
        const input = document.activeElement
        if (input instanceof HTMLElement && input.dataset.phrase) {
            const phraseId = parseInt(input.dataset.phrase)
            const phrase = phrases.find(ph => ph.id === phraseId)
            focusPhrase(phrase)
        } else {
            focusPhrase(undefined)
        }
    }, [phrases, focusPhrase])

    useEffect(() => {
        const keydownCallback = async (e: globalThis.KeyboardEvent) => {
            if (e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
                switch (e.key) {
                    case 'Home': return;
                    case 'End': return;
                }
            }
        };

        window.addEventListener('keydown', keydownCallback);
        return () => window.removeEventListener('keydown', keydownCallback);
    }, [])

    return <div className="flex flex-col flex-grow w-full min-h-0 lg:flex-row">
        <div className="flex flex-col max-h-full min-h-0 gap-8 overflow-auto grow pt-8 pb-10 px-6">
            <ol
                className={`
                        flex h-fit content-start flex-wrap gap-x-2 gap-y-4
                        ${isHebrew ? 'ltr:flex-row-reverse' : 'rtl:flex-row-reverse'}
                    `}
            >
                {words.map(word => {
                    const phrase = phrases.find(ph => ph.wordIds.includes(word.id))!
                    return <TranslateWord
                        key={word.id}
                        word={word}
                        wordSelected={selectedWords.includes(word.id)}
                        phrase={phrase}
                        phraseFocused={phrase === focusedPhrase}
                        language={language}
                        isHebrew={isHebrew}
                        onFocus={() => {
                            setSidebarWord(word);
                            focusPhrase(phrase);
                        }}
                        onShowDetail={() => setShowSidebar(true)}
                        onOpenNotes={() => setTimeout(() => sidebarRef.current?.openNotes(), 0)}
                        onSelect={() => selectWord(word.id)} 
                    />
                })}
            </ol>
        </div>
        {showSidebar && (
            <TranslationSidebar
                ref={sidebarRef}
                language={language}
                word={sidebarWord}
                phrase={sidebarPhrase!}
                canReadTranslatorNotes={true}
                canEditNotes={false}
                className="h-[320px] lg:h-auto lg:w-1/3 lg:min-w-[320px] lg:max-w-[480px] mt-8 mb-10 mx-6 lg:ms-0 lg:me-8"
                onClose={() => setShowSidebar(false)}
            />
        )}

    </div>
}
