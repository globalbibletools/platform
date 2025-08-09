"use client";

import Button from "@/components/Button";
import { Icon } from "@/components/Icon";
import ListboxInput from "@/components/ListboxInput";
import bookKeys from "@/data/book-keys.json";
import { useTranslations } from "next-intl";
import { PointerEvent, useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import throttle from "@/components/throttle";

interface VerseAudioTiming {
  verseId: string;
  start: number;
}

export interface AudioDialogProps {
  className?: string;
  chapterId: string;
  onVerseChange?(verseId: string | undefined): void;
  onClose?(): void;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5];
const PREV_THRESHOLD = 1.5; // The time threshold after which clicking previous verse, restarts the current verse.

export default function AudioDialog({
  className = "",
  chapterId,
  onClose,
  onVerseChange,
}: AudioDialogProps) {
  const t = useTranslations("AudioDialog");

  const bookId = parseInt(chapterId.slice(0, 2)) || 1;
  const chapter = parseInt(chapterId.slice(2, 5)) || 1;

  const [isPlaying, setPlaying] = useState(false);
  const [speaker, setSpeaker] = useState("HEB");
  const [speed, setSpeed] = useState(2);

  const { data } = useSWR(
    ["chapter-audio", speaker, chapterId],
    async ([, speaker, chapterId]) => {
      const response = await fetch(`/api/audio/${speaker}/${chapterId}`);
      return (await response.json()) as Promise<VerseAudioTiming[]>;
    },
  );

  const canPlay = !!data;

  const audio = useRef<HTMLAudioElement>(null);

  const reset = useCallback(() => {
    const el = audio.current;
    if (!el) return;

    el.currentTime = data?.[0].start ?? 0;
    setProgress(0);
  }, []);

  const prevVerse = useCallback(
    (count = 1) => {
      const el = audio.current;
      if (!el || !data) return;

      const currentIndex = data.reduce(
        (last, v, i) => (v.start > el.currentTime ? last : i),
        -1,
      );
      if (currentIndex < 0) return;

      if (
        el.currentTime - data[currentIndex].start < PREV_THRESHOLD ||
        count > 1
      ) {
        el.currentTime = data[Math.max(0, currentIndex - count)].start;
      } else if (currentIndex >= 0) {
        el.currentTime = data[currentIndex].start;
      }
    },
    [data],
  );

  const nextVerse = useCallback(
    (count = 1) => {
      const el = audio.current;
      if (!el || !data) return;

      const currentIndex = data.reduce(
        (last, v, i) => (v.start > el.currentTime ? last : i),
        -1,
      );
      if (currentIndex < 0) return;

      el.currentTime =
        data[Math.min(data.length - 1, currentIndex + count)].start;
    },
    [data],
  );

  const seek = useCallback((progress: number) => {
    const el = audio.current;
    if (!el) return;

    el.currentTime = progress;
  }, []);

  const toggleSpeed = useCallback(() => {
    const newIndex = (speed + 1) % SPEEDS.length;
    setSpeed(newIndex);

    const el = audio.current;
    if (!el) return;

    el.playbackRate = SPEEDS[newIndex];
  }, []);

  const togglePlay = useCallback(() => {
    const el = audio.current;
    if (!el) return;

    if (el.paused) {
      el.play();
    } else {
      el.pause();
    }
  }, []);

  const src = `https://assets.globalbibletools.com/audio/${speaker}/${bookKeys[bookId - 1]}/${chapter.toString().padStart(3, "0")}.mp3`;
  const lastVerseId = useRef<string>();

  useEffect(() => {
    const el = audio.current;
    if (!el) return;

    el.currentTime = data?.[0].start ?? 0;
  }, [data]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!data || !(e.target instanceof HTMLElement)) return;

      const verseNumber = e.target.dataset.verseNumber;
      if (!verseNumber) return;

      const el = audio.current;
      if (!el) return;

      const index = parseInt(verseNumber) - 1;
      if (data[index]) {
        el.currentTime = data[index].start;
        el.play();
      }
    }
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [data]);

  const [length, setLength] = useState(0);
  const [progress, setProgress] = useState(0);

  function onTimeUpdate() {
    const el = audio.current;
    if (!el || !data) return;

    setProgress(audio.current?.currentTime ?? 0);

    const verse = data.reduce<VerseAudioTiming | undefined>(
      (last, v) => (v.start > el.currentTime ? last : v),
      undefined,
    );

    if (lastVerseId.current !== verse?.verseId) {
      onVerseChange?.(verse?.verseId);
      lastVerseId.current = verse?.verseId;
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const el = audio.current;
      if (!el) return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;

      switch (e.key) {
        case "PageUp": {
          prevVerse(5);
          break;
        }
        case "PageDown": {
          nextVerse(5);
          break;
        }
        case "Home": {
          el.currentTime = data?.[0]?.start ?? 0;
          break;
        }
        case "End": {
          el.currentTime = el.duration;
          break;
        }
        case "ArrowUp":
        case "ArrowLeft": {
          prevVerse();
          break;
        }
        case "ArrowDown":
        case "ArrowRight": {
          nextVerse();
          break;
        }
        case " ": {
          togglePlay();
          break;
        }
        default:
          return;
      }

      e.preventDefault();
      e.stopPropagation();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [data, prevVerse, nextVerse, togglePlay]);

  return (
    <dialog
      open
      className={`
            ${className}
            fixed border border-gray-400 shadow-lg bg-white rounded flex flex-col items-center px-4 pt-8 pb-3 gap-4
            dark:bg-gray-800 dark:border-gray-700 dark:shadow-none dark:text-gray-300
        `}
    >
      <button
        type="button"
        className="absolute text-red-700 -end-1 -top-1 w-8 h-8 rounded-lg focus:outline-green-400"
        onClick={onClose}
      >
        <Icon icon="close" />
        <span className="sr-only">{t("close")}</span>
      </button>
      <audio
        ref={audio}
        src={src}
        onPlay={() => {
          setPlaying(true);
        }}
        onPause={() => {
          setPlaying(false);
          if (lastVerseId.current !== undefined) {
            onVerseChange?.(undefined);
            lastVerseId.current = undefined;
          }
        }}
        onLoadedMetadata={() => {
          setLength(audio.current?.duration ?? 0);
        }}
        onTimeUpdate={onTimeUpdate}
      />
      <div className="flex gap-2">
        <Button
          variant="tertiary"
          className="w-8"
          disabled={!canPlay}
          onClick={() => prevVerse()}
        >
          <Icon icon="backward-step" size="lg" fixedWidth />
          <span className="sr-only">{t("prev")}</span>
        </Button>
        <Button
          variant="tertiary"
          className="w-8"
          disabled={!canPlay}
          onClick={reset}
        >
          <Icon icon="arrow-rotate-left" size="lg" fixedWidth />
          <span className="sr-only">{t("restart")}</span>
        </Button>
        <Button
          variant="tertiary"
          className="w-8"
          disabled={!canPlay}
          onClick={togglePlay}
        >
          <Icon icon={isPlaying ? "pause" : "play"} size="lg" fixedWidth />
          <span className="sr-only">{t(isPlaying ? "pause" : "play")}</span>
        </Button>
        <Button
          variant="tertiary"
          className="w-8"
          disabled={!canPlay}
          onClick={() => nextVerse()}
        >
          <Icon icon="forward-step" size="lg" fixedWidth />
          <span className="sr-only">{t("next")}</span>
        </Button>
      </div>
      <div className="w-full flex justify-between gap-3 items-center">
        <span className="text-sm">
          {Math.floor(progress / 60)
            .toString()
            .padStart(2, "0")}
          :
          {Math.round(progress % 60)
            .toString()
            .padStart(2, "0")}
        </span>
        <ScrubBar
          className="w-full"
          length={length}
          progress={progress}
          onChange={seek}
        />
        <span className="text-sm">
          {Math.floor(length / 60)
            .toString()
            .padStart(2, "0")}
          :
          {Math.round(length % 60)
            .toString()
            .padStart(2, "0")}
        </span>
      </div>
      <div className="flex items-center justify-between w-full">
        <Button variant="tertiary" disabled={!canPlay} onClick={toggleSpeed}>
          <span className="sr-only">{t("speed")}</span>
          {SPEEDS[speed]}x
        </Button>
        <ListboxInput
          menuClassName="min-w-[120px]"
          items={[
            { label: "Schmueloff", value: "HEB" },
            { label: "Beeri", value: "RDB" },
          ]}
          value={speaker}
          onChange={setSpeaker}
          aria-label={t("speaker")}
          up
          right
        />
      </div>
    </dialog>
  );
}

interface ScrubBarProps {
  label?: string;
  className?: string;
  length: number;
  progress: number;
  onChange?(progress: number): void;
}

function ScrubBar({
  className = "",
  length,
  progress,
  label,
  onChange,
}: ScrubBarProps) {
  const percent = progress / length;

  const root = useRef<HTMLDivElement>(null);
  const [thumbKey, setThumbKey] = useState("left");
  useEffect(() => {
    const ancestor = root.current?.closest("[dir]") as HTMLElement;
    setThumbKey(ancestor?.dir === "ltr" ? "left" : "right");
  }, []);

  const dragState = useRef({ pointerId: -1 });
  function onPointerDown(e: PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = { pointerId: e.pointerId };
  }
  const onPointerMove = throttle((e: PointerEvent) => {
    e.preventDefault();
    if (e.pointerId !== dragState.current.pointerId) return;
    if (!root.current) return;

    const rect = root.current.getBoundingClientRect();
    const pos = Math.max(rect.left, Math.min(rect.right, e.clientX));
    const progressPercent = (pos - rect.left) / rect.width;
    onChange?.(progressPercent * length);
  }, 100);
  function onPointerUp(e: PointerEvent) {
    e.preventDefault();
    if (e.pointerId !== dragState.current.pointerId) return;
    if (!root.current) return;

    dragState.current = { pointerId: -1 };
  }

  function onTouch(e: PointerEvent) {
    if (!root.current) return;
    const rect = root.current.getBoundingClientRect();
    const pos = Math.max(rect.left, Math.min(rect.right, e.clientX));
    const progressPercent = (pos - rect.left) / rect.width;
    onChange?.(progressPercent * length);
  }

  return (
    <div
      ref={root}
      tabIndex={0}
      className={`${className} group relative bg-gray-400 rounded-full h-2 pointer-cursor focus:outline-none dark:bg-gray-500`}
      onPointerDown={onTouch}
      role="slider"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={length}
      aria-valuenow={progress}
      aria-orientation="horizontal"
    >
      <div
        className="bg-green-300 absolute h-2 start-0 rounded-full"
        style={{
          width: `${percent * 100}%`,
        }}
        role="presentation"
      />
      <div
        className="bg-blue-800 dark:bg-green-400 absolute h-4 w-4 -top-1 -ml-2 rounded-full pointer-cursor group-focus:outline outline-green-300 outline-2"
        style={{
          [thumbKey]: `${percent * 100}%`,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="presentation"
      />
    </div>
  );
}
