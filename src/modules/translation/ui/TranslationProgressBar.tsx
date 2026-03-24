"use client";

import { useTextWidth } from "@/utils/text-width";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { getBookProgress } from "../actions/getBookProgress";
import { useTranslations } from "next-intl";

export default function TranslationProgressBar({
  className = "",
}: {
  className?: string;
}) {
  const { verseId, code } = useParams({
    from: "/_main/translate/$code/$verseId",
  });
  const bookId = parseInt(verseId.slice(0, 2));

  const { isLoading, data } = useQuery({
    queryKey: ["book-progress", bookId, code],
    queryFn: () => getBookProgress({ data: { bookId, code } }),
    enabled: bookId > 0 && code.length > 0,
  });

  const t = useTranslations("TranslationProgressBar");

  const { approvedCount = 0, wordCount = 0 } = data ?? {};
  const description =
    wordCount > 0 ?
      t("progress", {
        wordCount,
        approvedCount,
        percent: ((100 * approvedCount) / wordCount).toFixed(1),
      })
    : "";
  const percentage = (wordCount === 0 ? 0 : approvedCount / wordCount) * 100;

  const progressElementRef = useRef<HTMLDivElement>(null);

  const textElementWidth = useTextWidth({
    text: description,
    fontSize: "12px",
    fontFamily: "inherit",
  });

  const [textStyle, setTextStyle] = useState({
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
        className={`absolute group w-full h-2 hover:h-6 top-0 start-0 z-1 ${isLoading ? "bg-gray-100" : "bg-brown-100"}`}
      >
        <div
          ref={progressElementRef}
          style={{ width: `${percentage}%` }}
          className="bg-blue-700 h-full"
        />
        <div className="absolute hidden group-hover:block text-xs select-none top-0 start-0 w-full h-full px-6 md:px-8">
          <div
            className={`h-6 w-fit leading-6 dark:text-gray-900 ${textStyle.fitsInside ? "text-white" : ""}`}
            style={{ translate: `${textStyle.textOffset}px 0px` }}
          >
            {description}
          </div>
        </div>
      </div>
    </div>
  );
}
