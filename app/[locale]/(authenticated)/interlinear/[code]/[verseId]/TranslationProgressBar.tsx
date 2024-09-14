import { useTextWidth } from "@/app/utils/text-width";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";

export interface TranslationProgressBarProps {
    wordCount: number
    approvedCount: number
}

export default function TranslationProgressBar({ wordCount, approvedCount }: TranslationProgressBarProps) {
    const t = useTranslations("TranslationProgressBar")

    const progressElementRef = useRef<HTMLDivElement>(null);

    const percentageFull = (approvedCount / wordCount) * 100;
    const progressText = t("progress", { approvedCount, wordCount, percent: percentageFull.toFixed(1) })

    const textElementWidth = useTextWidth({
        text: progressText,
        fontSize: '12px',
        fontFamily: 'inherit',
    });

    const [textOffset, setTextOffset] = useState(0);

    useEffect(() => {
        const { current: progressElement } = progressElementRef;
        if (!progressElement) return;

        const resizeObserver = new ResizeObserver(() => {
            const fitsInside = (textElementWidth + 48) <= progressElement.offsetWidth
            setTextOffset(fitsInside ? 0 : Math.max(0, progressElement.offsetWidth - 24))
        });
        resizeObserver.observe(progressElement);
        return () => resizeObserver.disconnect();
    }, [textElementWidth]);


    return <div className="absolute h-2 hover:h-6 group z-[1] w-full top-0 start-0 flex bg-brown-100">
            <div
                ref={progressElementRef}
                style={{ width: `${percentageFull}%` }}
                className="bg-blue-700"
            />
            <div className="absolute hidden group-hover:block text-xs select-none top-0 start-0 w-full h-full px-6 md:px-8">
                <div className={`h-6 leading-6 ${textOffset === 0 ? 'text-white' : ''}`} style={{ translate: `${textOffset}px 0px` }}>
                {progressText}
                </div>
            </div>
    </div>
}
