"use client";

import DOMPurify from "dompurify";
import { memo, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "use-intl";
import { useQuery } from "@tanstack/react-query";
import { VersesPreview } from "@/components/VersesPreview";
import { parseReferenceRange } from "@/verse-utils";
import { getWordResource } from "@/ui/translation/serverFns/getWordResource";
import LoadingSpinner from "@/components/LoadingSpinner";
import { ClientOnly } from "@tanstack/react-router";

interface TranslationLexiconPanelProps {
  wordId: string;
  language: {
    code: string;
    font: string;
    textDirection: string;
    isMember: boolean;
  };
}

export default function TranslationLexiconPanel({
  wordId,
  language,
}: TranslationLexiconPanelProps) {
  const t = useTranslations("TranslationSidebar");

  const { data: resource, isLoading } = useQuery({
    queryKey: ["translation-resource", wordId],
    queryFn: () => getWordResource({ data: { wordId } }),
  });

  const [previewElement, setPreviewElement] = useState<HTMLDivElement | null>(
    null,
  );
  const [previewVerseIds, setPreviewVerseIds] = useState<string[]>([]);

  const openPreview = (anchorElement: HTMLAnchorElement) => {
    const oldPreview = document.querySelector("#ref-preview");
    oldPreview?.remove();

    const reference = anchorElement.getAttribute("data-ref") ?? "";
    setPreviewVerseIds(parseReferenceRange(reference, t.raw("book_names")));

    const nextPreviewElement = document.createElement("div");
    nextPreviewElement.id = "ref-preview";
    nextPreviewElement.className = "float-left w-full";
    anchorElement.insertAdjacentElement("afterend", nextPreviewElement);
    setPreviewElement(nextPreviewElement);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!resource) {
    return <div></div>;
  }

  return (
    <div>
      <div className="text-lg mb-3 font-bold me-2">{resource.name}</div>
      <div
        className="leading-relaxed text-sm font-mixed"
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (target.nodeName === "A" && target.classList.contains("ref")) {
            openPreview(target as HTMLAnchorElement);
          }
        }}
      >
        <ClientOnly>
          <LexiconText content={resource.entry} />
        </ClientOnly>
      </div>
      {previewElement !== null &&
        createPortal(
          <VersesPreview
            language={language}
            verseIds={previewVerseIds}
            onClose={() => {
              setPreviewVerseIds([]);
              setPreviewElement(null);
              previewElement.remove();
            }}
          />,
          previewElement,
        )}
    </div>
  );
}

const LexiconText = memo(function LexiconText({
  content,
}: {
  content: string;
}) {
  const html = useMemo(() => DOMPurify.sanitize(content), [content]);

  return (
    <div
      dangerouslySetInnerHTML={{
        __html: html,
      }}
    />
  );
});
