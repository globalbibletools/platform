"use client";

import { useEffect, useRef, useState } from "react";
import TranslateWord from "./TranslateWord"
import TranslationSidebar, { TranslationSidebarRef } from "./TranslationSidebar";

export interface TranslationViewProps {
    verseId: string
    words: { id: string, text: string, referenceGloss?: string, suggestions: string[], machineGloss?: string, lemma: string, grammar: string, resource?: { name: string, entry: string } }[]
    phrases: { id: string, wordIds: string[], gloss?: { text: string, state: string }, translatorNote?: { authorName: string, timestamp: string, content: string }, footnote?: { authorName: string, timestamp: string, content: string } }[]
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

    return <div className="flex flex-col flex-grow w-full min-h-0 lg:flex-row">
        <div className="flex flex-col max-h-full min-h-0 gap-8 overflow-auto grow pt-8 pb-10 px-6">
            <ol
                className={`
                        flex h-fit content-start flex-wrap gap-x-2 gap-y-4
                        ${isHebrew ? 'ltr:flex-row-reverse' : 'rtl:flex-row-reverse'}
                    `}
            >
                {words.map(word => (
                    <TranslateWord
                        key={word.id}
                        word={word}
                        phrase={phrases.find(ph => ph.wordIds.includes(word.id))}
                        language={language}
                        isHebrew={isHebrew}
                        onFocus={() => {
                            setSidebarWord(word);
                            // setFocusedWord(word.id);
                        }}
                        onShowDetail={() => setShowSidebar(true)}
                        onOpenNotes={() => setTimeout(() => sidebarRef.current?.openNotes(), 0)}
                    />
                ))}
            </ol>
        </div>
        {showSidebar && (
            <TranslationSidebar
                ref={sidebarRef}
                language={language}
                word={sidebarWord}
                phrase={sidebarPhrase}
                canReadTranslatorNotes={true}
                canEditNotes={false}
                className="h-[320px] lg:h-auto lg:w-1/3 lg:min-w-[320px] lg:max-w-[480px] mt-8 mb-10 mx-6 lg:ms-0 lg:me-8"
                onClose={() => setShowSidebar(false)}
            />
        )}

    </div>
}
