"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";

interface Phrase {
    id: string
    wordIds: string[]
}

interface TranslationClientStateContextValue {
    selectedWords: string[],
    focusedPhrase?: Phrase
    selectWord(wordId?: string): void
    clearSelectedWords(): void
    focusPhrase(phrase?: Phrase): void
}

const TranslationClientStateContext = createContext<TranslationClientStateContextValue | null>(null)

export function TranslationClientStateProvider({ verseId, children }: { verseId: string, children: ReactNode }) {
    const [focusedPhrase, focusPhrase] = useState<Phrase>()
    const [selectedWords, setSelectedWords] = useState<string[]>([])
    useEffect(() => {
        setSelectedWords([])
        focusPhrase(undefined)
    }, [verseId])

    const selectWord = useCallback((wordId: string) => {
        setSelectedWords((words) => {
            if (words.includes(wordId)) {
                return words.filter((w) => w !== wordId);
            } else {
                return [...words, wordId];
            }
        });
    }, [])

    const clearSelectedWords = useCallback(() => {
        setSelectedWords([]);
    }, [])

    return <TranslationClientStateContext.Provider value={{ selectedWords, focusedPhrase, selectWord, clearSelectedWords, focusPhrase }}>
        {children}
    </TranslationClientStateContext.Provider>
}

export function useTranslationClientState() {
    const context = useContext(TranslationClientStateContext)
    if (!context) {
        throw new Error('useTranslationClientState must be used inside of TranslationClientStateProvider')
    }
    return context
}
