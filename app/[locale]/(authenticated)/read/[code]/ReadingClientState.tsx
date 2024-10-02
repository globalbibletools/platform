"use client";

import { createContext, ReactNode, useContext, useState } from "react";

interface VerseAudioTimings {
    id: string
    timings: {
        speaker: string
        start?: number
        end?: number
    }[]
}

interface ReadingClientState {
    textSize: number
    verseAudioTimings: VerseAudioTimings[]
    setTextSize(textSize: number): void
    setVerseAudioTimings(timings: VerseAudioTimings[]): void
}

const ReadingClientStateContext = createContext<ReadingClientState | null>(null)

export function ReadingClientStateProvider({ children }: { children: ReactNode }) {
    const [textSize, setTextSize] = useState(3)
    const [verseAudioTimings, setVerseAudioTimings] = useState<VerseAudioTimings[]>([])

    return <ReadingClientStateContext.Provider value={{ textSize, verseAudioTimings, setTextSize, setVerseAudioTimings }}>
        {children}
    </ReadingClientStateContext.Provider>
}

export function useReadingClientState() {
    const context = useContext(ReadingClientStateContext)
    if (!context) {
        throw new Error('useReadingClientState must be used inside of ReadingClientStateProvider')
    }
    return context
}
