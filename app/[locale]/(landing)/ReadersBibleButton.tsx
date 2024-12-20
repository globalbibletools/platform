"use client";
import { trackClick } from "../GoogleAnalytics";

export default function ReadersBibleButton() {
    return <a
        href="/read"
        className="rounded-lg bg-blue-800 text-white font-bold shadow-md px-4 flex items-center justify-center h-8 md:mt-[4px] ms-1"
        data-ga-id="landing-readers-bible-cta"
        onClick={() => trackClick('landing_readers_bible_cta')}
    >
        Reader&apos;s Bible
    </a>
}
