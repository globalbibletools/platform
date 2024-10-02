"use client";

import Button from "@/app/components/Button";
import ComboboxInput from "@/app/components/ComboboxInput";
import { Icon } from "@/app/components/Icon";
import { bookKeys } from "@/data/book-keys";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";

interface VerseAudioTiming {
    verseId: string
    start: number
}

export interface AudioPlayerProps {
    className?: string
    chapterId: string
    onVerseChange?(verseId: string | undefined): void
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5]
const PREV_THRESHOLD = 1.5 // The time threshold after which clicking previous verse, restarts the current verse.

export default function AudioPlayer({ className = '', chapterId, onVerseChange }: AudioPlayerProps) {
    const t = useTranslations('AudioPlayer')

    const bookId = parseInt(chapterId.slice(0, 2)) || 1;
    const chapter = parseInt(chapterId.slice(2, 5)) || 1;

    const [isPlaying, setPlaying] = useState(false)
    const [speaker, setSpeaker] = useState('HEB')
    const [speed, setSpeed] = useState(2)

    const { data } = useSWR(['chapter-audio', speaker, chapterId], async ([,speaker, chapterId]) => {
        const response = await fetch(`/api/audio/${speaker}/${chapterId}`)
        return await response.json() as Promise<VerseAudioTiming[]>
    })

    const canPlay = !!data

    const audio = useRef<HTMLAudioElement>(null)

    function reset() {
        const el = audio.current
        if (!el) return

        el.currentTime = data?.[0].start ?? 0
    }

    function prevVerse() {
        const el = audio.current
        if (!el || !data) return

        const currentIndex = data.reduce(
            (last, v, i) => v.start > el.currentTime ? last : i,
            -1
        )
        if (currentIndex < 0) return

        if (el.currentTime - data[currentIndex].start < PREV_THRESHOLD) {
            el.currentTime = data[currentIndex - 1].start
        } else if (currentIndex > 0) {
            el.currentTime = data[currentIndex].start
        }
    }

    function nextVerse() {
        const el = audio.current
        if (!el || !data) return

        const currentIndex = data.reduce(
            (last, v, i) => v.start > el.currentTime ? last : i,
            -1
        )
        if (currentIndex < 0) return

        if (data[currentIndex + 1]) {
            el.currentTime = data[currentIndex + 1].start
        }
    }

    function toggleSpeed() {
        const newIndex = (speed + 1) % SPEEDS.length
        setSpeed(newIndex)

        const el = audio.current
        if (!el) return

        el.playbackRate = SPEEDS[newIndex]
    }

    const src = `https://gbt-audio.s3.amazonaws.com/${speaker}/${bookKeys[bookId - 1]}/${chapter.toString().padStart(3, '0')}.mp3`
    const progressInterval = useRef<NodeJS.Timeout>()
    const lastVerseId = useRef<string>()
    useEffect(() => {
        if (isPlaying && data) {
            audio.current?.play()
            progressInterval.current = setInterval(() => {
                const el = audio.current
                if (!el) return

                const verse = data.reduce<VerseAudioTiming | undefined>(
                    (last, v) => v.start > el.currentTime ? last : v,
                    undefined
                )

                if (lastVerseId.current !== verse?.verseId) {
                    onVerseChange?.(verse?.verseId)
                    lastVerseId.current = verse?.verseId
                }
            }, 500)
            return () => clearInterval(progressInterval.current)
        } else {
            audio.current?.pause()
            if (lastVerseId.current !== undefined) {
                onVerseChange?.(undefined)
                lastVerseId.current = undefined
            }
        }
    }, [isPlaying, src, data])

    useEffect(() => {
        const el = audio.current
        if (!el) return

        el.currentTime = data?.[0].start ?? 0
    }, [data])

    return <div className={`${className} flex items-center`}>
        <audio ref={audio} src={src} />
        <Button variant="tertiary" className="w-8" disabled={!canPlay} onClick={prevVerse}>
            <Icon icon='caret-left' size="lg" />
            <span className="sr-only">{t('prev')}</span>
        </Button>
        <Button variant="tertiary" className="w-8" disabled={!canPlay} onClick={reset}>
            <Icon icon="arrow-rotate-left" />
            <span className="sr-only">{t('restart')}</span>
        </Button>
        <Button variant="tertiary" className="w-8" disabled={!canPlay} onClick={() => setPlaying(playing => !playing)}>
            <Icon icon={isPlaying ? 'pause' : 'play'} />
            <span className="sr-only">{t(isPlaying ? 'pause' : 'play')}</span>
        </Button>
        <Button variant="tertiary" className="w-8" disabled={!canPlay} onClick={nextVerse}>
            <Icon icon='caret-right' size="lg" />
            <span className="sr-only">{t('next')}</span>
        </Button>
        <Button variant="tertiary" className="w-10 text-sm !justify-start !ps-1" disabled={!canPlay} onClick={toggleSpeed}>
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
