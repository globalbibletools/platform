"use client";

import { Icon } from "@/components/Icon";
import { RichTextInputRef } from "@/components/RichTextInput";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { useTranslations } from "next-intl";
import { Fragment, Ref, useImperativeHandle, useRef, useState } from "react";
import TranslationLexiconPanel from "./TranslationLexiconPanel";
import PhraseNoteEditor from "./PhraseNoteEditor";

export interface Word {
  id: string;
  text: string;
  lemma: string;
  grammar: string;
}

export interface TranslationSidebarRef {
  openNotes(): void;
}

export interface TranslationSidebarProps {
  className?: string;
  word: Word;
  phraseId: number;
  language: {
    code: string;
    font: string;
    textDirection: string;
    isMember: boolean;
  };
  onClose?(): void;
  ref?: Ref<TranslationSidebarRef>;
}

export default function TranslationSidebar({
  className = "",
  language,
  word,
  phraseId,
  onClose,
  ref,
}: TranslationSidebarProps) {
  const t = useTranslations("TranslationSidebar");

  const canReadTranslatorNotes = language.isMember;
  const canEditNotes = language.isMember;

  const [tabIndex, setTabIndex] = useState(0);

  const translatorNotesEditorRef = useRef<RichTextInputRef>(null);
  const footnotesEditorRef = useRef<RichTextInputRef>(null);
  useImperativeHandle(ref, () => ({
    openNotes: () => {
      setTabIndex(1);
      setTimeout(() => {
        (
          translatorNotesEditorRef.current ?? footnotesEditorRef.current
        )?.focus();
      }, 0);
    },
  }));

  return (
    <div
      className={`
        relative flex flex-col gap-4 shrink-0 shadow rounded-2xl bg-brown-100
        dark:bg-gray-800 dark:shadow-none
        ${className}
      `}
    >
      <button
        onClick={onClose}
        type="button"
        className="absolute w-9 h-9 end-1 top-1 text-red-700 dark:text-red-600 rounded-md focus-visible:outline-2 outline-green-300"
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
        <TabGroup as={Fragment} selectedIndex={tabIndex} onChange={setTabIndex}>
          <TabList className="flex flex-row">
            <div className="border-b border-blue-800 dark:border-green-400 h-full w-2"></div>
            {[t("tabs.lexicon"), t("tabs.notes")].map((title) => (
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
            ))}
            <div className="border-b border-blue-800 dark:border-green-400 h-full grow"></div>
          </TabList>
          <TabPanels className="overflow-y-auto grow px-4 pt-4 pb-10 mb-4">
            <TabPanel unmount={false}>
              <TranslationLexiconPanel wordId={word.id} language={language} />
            </TabPanel>
            <TabPanel unmount={false}>
              <div className="flex flex-col gap-6 pb-2">
                {canReadTranslatorNotes && (
                  <PhraseNoteEditor
                    phraseId={phraseId}
                    languageCode={language.code}
                    canEdit={canEditNotes}
                    canReadMetadata
                    noteType="translatorNote"
                    title={t("notes.translator_notes")}
                    editorRef={translatorNotesEditorRef}
                  />
                )}
                <PhraseNoteEditor
                  phraseId={phraseId}
                  languageCode={language.code}
                  canEdit={canEditNotes}
                  canReadMetadata={canReadTranslatorNotes}
                  noteType="footnote"
                  title={t("notes.footnotes")}
                  editorRef={footnotesEditorRef}
                />
              </div>
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </div>
    </div>
  );
}
