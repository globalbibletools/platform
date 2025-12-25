"use client";

import { useTextWidth } from "@/utils/text-width";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";

export default function TranslationProgressBar({
  className = "",
}: {
  className?: string;
}) {
  const { locale, verseId, code } = useParams<{
    locale: string;
    verseId: string;
    code: string;
  }>();
  const bookId = parseInt(verseId.slice(0, 2));
  const { isLoading, data } = useSWR(
    { type: "book-progress", locale, bookId, code },
    async ({ locale, bookId, code }) => {
      const response = await fetch(
        `/${locale}/translate/${code}/books/${bookId}/progress`,
      );
      const data = await response.json();
      return data as {
        wordCount: number;
        approvedCount: number;
        description: string;
      };
    },
  );

  const { approvedCount = 0, wordCount = 0, description = "" } = data ?? {};
  const percentage = (wordCount === 0 ? 0 : approvedCount / wordCount) * 100;

  const progressElementRef = useRef<HTMLDivElement>(null);

  const textElementWidth = useTextWidth({
    text: description,
    fontSize: "12px",
    fontFamily: "inherit",
  });

  const [{ textOffset, fitsInside }, setTextStyle] = useState({
    textOffset: 0,
    fitsInside: false,
  });

  useEffect(() => {
    const { current: progressElement } = progressElementRef;
    if (!progressElement) return;

    const resizeObserver = new ResizeObserver(() => {
      const fitsInside = textElementWidth + 48 <= progressElement.offsetWidth;
      if (fitsInside) {
        setTextStyle({
          textOffset: 0,
          fitsInside: true,
        });
      } else {
        setTextStyle({
          textOffset: Math.max(0, progressElement.offsetWidth - 24),
          fitsInside: false,
        });
      }
    });
    resizeObserver.observe(progressElement);
    return () => resizeObserver.disconnect();
  }, [textElementWidth]);

  return (
    <div className={`h-2 ${className}`}>
      <div
        className={`absolute group w-full h-2 hover:h-6 top-0 start-0 z-[1] ${isLoading ? "bg-gray-100" : "bg-brown-100"}`}
      >
        <div
          ref={progressElementRef}
          style={{ width: `${percentage}%` }}
          className="bg-blue-700 h-full"
        />
        <div className="absolute hidden group-hover:block text-xs select-none top-0 start-0 w-full h-full px-6 md:px-8">
          <div
            className={`h-6 w-fit leading-6 dark:text-gray-900 ${fitsInside ? "text-white" : ""}`}
            style={{ translate: `${textOffset}px 0px` }}
          >
            {description}
          </div>
        </div>
      </div>
    </div>
  );
}
