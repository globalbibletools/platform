"use client";

import Button from "@/app/components/Button";
import ComboboxInput from "@/app/components/ComboboxInput";
import { Icon } from "@/app/components/Icon";
import { bookKeys } from "@/data/book-keys";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

export interface AudioPlayerProps {
    className?: string
    bookId: number
    chapter: number
    verseTimings: { id: string, timings: { speaker: string, start?: number, end?: number}[] }[]
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5]

export default function AudioPlayer({ className = '', bookId, chapter, verseTimings }: AudioPlayerProps) {
    const t = useTranslations('AudioPlayer')

    const [isPlaying, setPlaying] = useState(false)
    const [speaker, setSpeaker] = useState('HEB')
    const [speed, setSpeed] = useState(2)

    const audio = useRef<HTMLAudioElement>(null)

    console.log(verseTimings)
    const speakerTimings = verseTimings.map(v => {
        const timings = v.timings.find(t => t.speaker === speaker)
        return { id: v.id, start: timings?.start, end: timings?.end }
    })

    function reset() {
        const el = audio.current
        if (!el) return

        el.currentTime = 0
    }

    function prevVerse() {
        const el = audio.current
        if (!el) return

        const currentIndex = speakerTimings.findIndex(v => (typeof v.start === 'number' && v.start <= el.currentTime) && (typeof v.end === 'number' && v.end >= el.currentTime))
        if (!currentIndex) return

        const prevTiming = speakerTimings[currentIndex - 1]
        if (typeof prevTiming?.start !== 'number') return
        el.currentTime = prevTiming.start
    }

    function nextVerse() {
        const el = audio.current
        if (!el) return

        const currentIndex = speakerTimings.findIndex(v => (typeof v.start === 'number' && v.start <= el.currentTime) && (typeof v.end === 'number' && v.end >= el.currentTime))
        if (currentIndex < 0) return

        const nextTiming = speakerTimings[currentIndex + 1]
        if (typeof nextTiming?.start !== 'number') return
        el.currentTime = nextTiming.start
    }

    function toggleSpeed() {
        const newIndex = (speed + 1) % SPEEDS.length
        setSpeed(newIndex)

        const el = audio.current
        if (!el) return

        el.playbackRate = SPEEDS[newIndex]
    }

    const src = `https://gbt-audio.s3.amazonaws.com/${speaker}/${bookKeys[bookId - 1]}/${chapter.toString().padStart(3, '0')}.mp3`
    useEffect(() => {
        if (isPlaying) {
            audio.current?.play()
        } else {
            audio.current?.pause()
        }
    }, [isPlaying, src])

    return <div className={`${className} flex items-center`}>
        <audio ref={audio} src={src} />
        <Button variant="tertiary" className="w-8" onClick={prevVerse}>
            <Icon icon='caret-left' size="lg" />
            <span className="sr-only">{t('prev')}</span>
        </Button>
        <Button variant="tertiary" className="w-8" onClick={reset}>
            <Icon icon="arrow-rotate-left" />
            <span className="sr-only">{t('restart')}</span>
        </Button>
        <Button variant="tertiary" className="w-8" onClick={() => setPlaying(playing => !playing)}>
            <Icon icon={isPlaying ? 'pause' : 'play'} />
            <span className="sr-only">{t(isPlaying ? 'pause' : 'play')}</span>
        </Button>
        <Button variant="tertiary" className="w-8" onClick={nextVerse}>
            <Icon icon='caret-right' size="lg" />
            <span className="sr-only">{t('next')}</span>
        </Button>
        <Button variant="tertiary" className="w-10 text-sm !justify-start !ps-1" onClick={toggleSpeed}>
            <span className="sr-only">{t('speed')}</span>
            {SPEEDS[speed]}x
        </Button>
        <ComboboxInput
            className="ms-2 w-56"
            items={[{ label: 'Abraham Schmueloff', value: 'HEB' }, { label: 'Rabbi Dan Beeri', value: 'RDB' }]}
            value={speaker} onChange={setSpeaker}
            aria-label={t('speaker')}
        />
    </div>
}
