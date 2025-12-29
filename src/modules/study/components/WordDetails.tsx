"use client";

import { Icon } from "@/components/Icon";
import RichText from "@/components/RichText";
import { Tab } from "@headlessui/react";
import DOMPurify from "isomorphic-dompurify";
import { useTranslations } from "next-intl";
import { forwardRef, Fragment, memo, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { parseReferenceRange } from "@/verse-utils";
import { VersesPreview } from "@/components/VersesPreview";
import { isRichTextEmpty } from "@/components/RichTextInput";
import useSWR from "swr";
import LoadingSpinner from "@/components/LoadingSpinner";

export interface Word {
  id: string;
  text: string;
  lemma: string;
  grammar: string;
  footnote?: string;
}

export interface WordDetailsProps {
  className?: string;
  word: Word;
  language: { font: string; textDirection: string; code: string };
  onClose?(): void;
}

export interface LemmaResource {
  lemmaId: string;
  name: string;
  entry: string;
}

export interface WordDetailsRef {
  openNotes(): void;
}

const WordDetails = forwardRef<WordDetailsRef, WordDetailsProps>(
  ({ className = "", language, word, onClose }) => {
    const t = useTranslations("WordDetails");

    const [tabIndex, setTabIndex] = useState(0);

    const hasNotes = !isRichTextEmpty(word.footnote ?? "");

    const { data, isLoading } = useSWR(
      ["lemma-resource", word.lemma],
      async ([, lemmaId]) => {
        const response = await fetch(`/api/lemma-resources/${lemmaId}`);
        return (await response.json()) as Promise<LemmaResource | undefined>;
      },
    );

    const lexiconEntryRef = useRef<HTMLDivElement>(null);
    const [previewElement, setPreviewElement] = useState<HTMLDivElement | null>(
      null,
    );
    const [previewVerseIds, setPreviewVerseIds] = useState<string[]>([]);
    const openPreview = (anchorElement: HTMLAnchorElement) => {
      const oldPreview = document.querySelector("#ref-preview");
      oldPreview?.remove();

      const reference = anchorElement.getAttribute("data-ref") ?? "";
      setPreviewVerseIds(parseReferenceRange(reference, t.raw("book_names")));

      const previewElement = document.createElement("div");
      previewElement.id = "ref-preview";
      anchorElement.insertAdjacentElement("afterend", previewElement);
      setPreviewElement(previewElement);
    };

    return (
      <div
        className={`
          relative flex flex-col gap-4 flex-shrink-0 shadow rounded-2xl bg-brown-100
          dark:bg-gray-800 dark:shadow-none
          ${className}
      `}
      >
        <button
          onClick={onClose}
          type="button"
          className="absolute w-9 h-9 end-1 top-1 text-red-700 dark:text-red-600 rounded-md focus-visible:outline outline-2 outline-green-300"
        >
          <Icon icon="xmark" />
          <span className="sr-only">{t("close")}</span>
        </button>
        <div className="flex items-start p-4 pb-0">
          <div>
            <div className="flex gap-4 items-baseline">
              <span className="font-mixed text-xl">{word.text}</span>
              <span>{word.lemma}</span>
            </div>
            <div>{word.grammar}</div>
          </div>
        </div>

        <div className="grow flex flex-col min-h-0">
          <Tab.Group selectedIndex={tabIndex} onChange={setTabIndex}>
            <Tab.List className="flex flex-row">
              <div className="border-b border-blue-800 dark:border-green-400 h-full w-2"></div>
              {[t("tabs.lexicon"), ...(hasNotes ? [t("tabs.notes")] : [])].map(
                (title) => (
                  <Fragment key={title}>
                    <Tab
                      className="
                                  px-4 py-1 text-blue-800 font-bold rounded-t-lg border border-blue-800 ui-selected:border-b-transparent outline-green-300 focus-visible:outline outline-2
                                  dark:text-green-400 dark:border-green-400
                                "
                    >
                      {title}
                    </Tab>
                    <div className="border-b border-blue-800 dark:border-green-400 h-full w-1"></div>
                  </Fragment>
                ),
              )}
              <div className="border-b border-blue-800 dark:border-green-400 h-full grow"></div>
            </Tab.List>
            <Tab.Panels className="overflow-y-auto grow px-4 pt-4 mb-4">
              <Tab.Panel unmount={false}>
                <div>
                  {isLoading && <LoadingSpinner />}
                  {!isLoading && data && (
                    <>
                      <div className="text-lg mb-3 font-bold me-2">
                        {data.name}
                      </div>
                      <div
                        className="leading-relaxed text-sm font-mixed"
                        ref={lexiconEntryRef}
                        onClick={(event) => {
                          const target = event.target as HTMLElement;
                          if (
                            target.nodeName === "A" &&
                            target.classList.contains("ref")
                          ) {
                            openPreview(target as HTMLAnchorElement);
                          }
                        }}
                      >
                        <LexiconText content={data.entry} />
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
                    </>
                  )}
                </div>
              </Tab.Panel>
              <Tab.Panel unmount={false}>
                <RichText className="pb-2" content={word.footnote ?? ""} />
              </Tab.Panel>
            </Tab.Panels>
          </Tab.Group>
        </div>
      </div>
    );
  },
);
WordDetails.displayName = "WordDetails";
export default WordDetails;

const LexiconText = memo(function LexiconText({
  content,
}: {
  content: string;
}) {
  const prev = useRef("");
  prev.current = content;
  const html = useMemo(() => DOMPurify.sanitize(content), [content]);
  return (
    <div
      dangerouslySetInnerHTML={{
        __html: html,
      }}
    />
  );
});
