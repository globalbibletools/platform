"use client";

import RichText from "@/components/RichText";
import { Tab, TabPanels, TabPanel, TabList, TabGroup } from "@headlessui/react";
import DOMPurify from "isomorphic-dompurify";
import { useTranslations } from "next-intl";
import { Fragment, memo, useMemo, useRef, useState } from "react";
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
  nativeLexicon?: string;
}

export interface WordDetailsProps {
  className?: string;
  word: Word;
  language: { font: string; textDirection: string; code: string };
  mode: "immersive" | "standard";
}

export interface LemmaResource {
  lemmaId: string;
  name: string;
  entry: string;
}

export default function WordDetails({
  language,
  word,
  mode,
}: WordDetailsProps) {
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
    <div className="absolute w-full h-full flex flex-col gap-4">
      <div className="flex items-start p-4 pb-0">
        <div>
          <div className="flex gap-4 items-baseline">
            <span className="font-mixed text-xl">{word.text}</span>
            <span>{word.lemma}</span>
          </div>
          {mode === "standard" && <div>{word.grammar}</div>}
          <div className="font-mixed mt-1">{word.nativeLexicon}</div>
        </div>
      </div>

      {mode === "standard" && (
        <div className="grow flex flex-col min-h-0">
          <TabGroup
            as={Fragment}
            selectedIndex={tabIndex}
            onChange={setTabIndex}
          >
            <TabList className="flex flex-row items-end">
              <div className="border-b border-blue-800 dark:border-green-400 h-full w-2"></div>
              {[t("tabs.lexicon"), ...(hasNotes ? [t("tabs.notes")] : [])].map(
                (title) => (
                  <Fragment key={title}>
                    <Tab
                      className="
                        px-4 py-1 text-blue-800 font-bold rounded-t-lg border border-blue-800 data-selected:border-b-transparent outline-green-300 focus-visible:outline-2
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
            </TabList>
            <TabPanels className="overflow-y-auto grow px-4 pt-4 mb-4">
              <TabPanel unmount={false}>
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
              </TabPanel>
              <TabPanel unmount={false}>
                <RichText className="pb-2" content={word.footnote ?? ""} />
              </TabPanel>
            </TabPanels>
          </TabGroup>
        </div>
      )}
    </div>
  );
}

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
