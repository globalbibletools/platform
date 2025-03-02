"use client";

import { Icon } from "@/components/Icon";
import RichText from "@/components/RichText";
import RichTextInput, { RichTextInputRef } from "@/components/RichTextInput";
import { Tab } from "@headlessui/react";
import DOMPurify from "isomorphic-dompurify";
import { throttle } from "lodash";
import { useTranslations } from "next-intl";
import {
  forwardRef,
  Fragment,
  memo,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { updateFootnote } from "../actions/updateFootnote";
import { updateTranslatorNote } from "../actions/updateTranslatorNote";
import { parseReferenceRange } from "@/verse-utils";
import { VersesPreview } from "@/components/VersesPreview";

export interface Word {
  id: string;
  text: string;
  lemma: string;
  grammar: string;
  resource?: {
    name: string;
    entry: string;
  };
}

export interface Phrase {
  id: number;
  translatorNote?: {
    authorName: string;
    timestamp: string;
    content: string;
  };
  footnote?: {
    authorName: string;
    timestamp: string;
    content: string;
  };
}

export interface TranslationSidebarProps {
  className?: string;
  word: Word;
  phrase: Phrase;
  language: {
    code: string;
    font: string;
    textDirection: string;
    roles: string[];
  };
  onClose?(): void;
}
export interface TranslationSidebarRef {
  openNotes(): void;
}

const TranslationSidebar = forwardRef<
  TranslationSidebarRef,
  TranslationSidebarProps
>(({ className = "", language, word, phrase, onClose }, ref) => {
  const t = useTranslations("TranslationSidebar");

  const canReadTranslatorNotes = language.roles.includes("VIEWER");
  const canEditNotes = language.roles.includes("TRANSLATOR");

  const [tabIndex, setTabIndex] = useState(0);

  const [translatorNoteContent, setTranslatorNoteContent] = useState("");
  const [footnoteContent, setFootnoteContent] = useState("");
  const wordId = useRef<string>("");
  useEffect(() => {
    if (wordId.current !== word.id) {
      wordId.current = word.id;
      setTranslatorNoteContent(phrase?.translatorNote?.content ?? "");
      setFootnoteContent(phrase?.footnote?.content ?? "");
    }
  }, [word.id, phrase]);

  const translatorNotesEditorRef = useRef<RichTextInputRef>(null);
  useImperativeHandle(ref, () => ({
    openNotes: () => {
      setTabIndex(1);
      setTimeout(() => {
        translatorNotesEditorRef.current?.focus();
      }, 0);
    },
  }));

  const [isSavingFootnote, setSavingFootnote] = useState(false);
  const saveFootnote = useMemo(
    () =>
      throttle(
        async (note: string) => {
          if (phrase.id) {
            setSavingFootnote(true);
            const form = new FormData();
            form.set("phraseId", phrase.id.toString());
            form.set("note", note);
            await updateFootnote(form);
            setSavingFootnote(false);
          }
        },
        5000,
        { leading: false, trailing: true },
      ),
    [phrase.id],
  );

  const [isSavingTranslatorNote, setSavingTranslatorNote] = useState(false);
  const saveTranslatorNote = useMemo(
    () =>
      throttle(
        async (note: string) => {
          if (phrase.id) {
            setSavingTranslatorNote(true);
            const form = new FormData();
            form.set("phraseId", phrase.id.toString());
            form.set("note", note);
            await updateTranslatorNote(form);
            setSavingTranslatorNote(false);
          }
        },
        5000,
        { leading: false, trailing: true },
      ),
    [phrase.id],
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
    previewElement.className = "float-left w-full";
    anchorElement.insertAdjacentElement("afterend", previewElement);
    setPreviewElement(previewElement);
  };

  return (
    <div
      className={`
          relative flex flex-col gap-4 flex-shrink-0 shadow rounded-2xl bg-brown-100
          dark:bg-gray-700 dark:shadow-none
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
            {[t("tabs.lexicon"), t("tabs.notes")].map((title) => (
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
            ))}
            <div className="border-b border-blue-800 dark:border-green-400 h-full grow"></div>
          </Tab.List>
          <Tab.Panels className="overflow-y-auto grow px-4 pt-4 pb-10 mb-4">
            <Tab.Panel unmount={false}>
              <div>
                {word.resource && (
                  <>
                    <div className="text-lg mb-3 font-bold me-2">
                      {word.resource.name}
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
                      <LexiconText content={word.resource.entry} />
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
              <div className="flex flex-col gap-6 pb-2">
                {canReadTranslatorNotes && (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-row gap-2.5">
                      <h2 className="font-bold">
                        {t("notes.translator_notes")}
                      </h2>
                      {isSavingTranslatorNote && (
                        <span className="italic">
                          <Icon icon="save" /> {t("notes.saving")}
                        </span>
                      )}
                    </div>
                    {phrase.translatorNote && (
                      <span className="italic">
                        {t("notes.note_description", {
                          timestamp: new Date(
                            phrase.translatorNote.timestamp,
                          ).toLocaleString(),
                          authorName: phrase.translatorNote.authorName,
                        })}
                      </span>
                    )}
                    {canEditNotes ?
                      <RichTextInput
                        ref={translatorNotesEditorRef}
                        name="translatorNoteContent"
                        value={translatorNoteContent}
                        onBlur={() => saveTranslatorNote.flush()}
                        onChange={(noteContent) => {
                          setTranslatorNoteContent(noteContent);
                          saveTranslatorNote(noteContent);
                        }}
                      />
                    : <RichText content={translatorNoteContent} />}
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <div className="flex flex-row gap-2.5">
                    <h2 className="font-bold">{t("notes.footnotes")}</h2>
                    {isSavingFootnote && (
                      <span className="italic">
                        <Icon icon="save" /> {t("notes.saving")}
                      </span>
                    )}
                  </div>
                  {canReadTranslatorNotes && phrase?.footnote && (
                    <span className="italic">
                      {t("notes.note_description", {
                        timestamp: new Date(
                          phrase.footnote?.timestamp,
                        ).toLocaleString(),
                        authorName: phrase.footnote.authorName,
                      })}
                    </span>
                  )}
                  {canEditNotes ?
                    <RichTextInput
                      name="footnoteContent"
                      value={footnoteContent}
                      onBlur={() => saveFootnote.flush()}
                      onChange={(noteContent) => {
                        setFootnoteContent(noteContent);
                        saveFootnote(noteContent);
                      }}
                    />
                  : <RichText content={footnoteContent} />}
                </div>
              </div>
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );
});
TranslationSidebar.displayName = "TranslationSidebar";
export default TranslationSidebar;

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
