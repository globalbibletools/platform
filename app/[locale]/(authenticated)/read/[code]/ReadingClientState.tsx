"use client";

import { createContext, ReactNode, useContext, useState } from "react";

interface ReadingClientState {
    textSize: number
    setTextSize(textSize: number): void
}

const ReadingClientStateContext = createContext<ReadingClientState | null>(null)

export function ReadingClientStateProvider({ children }: { children: ReactNode }) {
    const [textSize, setTextSize] = useState(3)

    return <ReadingClientStateContext.Provider value={{ textSize, setTextSize }}>
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
