import Button from "@/components/Button";
import Checkbox from "@/components/Checkbox";
import { Icon } from "@/components/Icon";
import { useTranslations } from "use-intl";
import { MouseEvent, useEffect, useMemo, useRef } from "react";
import { updateGlossAction } from "@/modules/translation/actions/updateGloss";
import { fontMap } from "@/fonts";
import {
  GlossApprovalMethodRaw,
  GlossStateRaw,
} from "@/modules/translation/types";
import { hasShortcutModifier } from "@/utils/keyboard-shortcuts";
import { MachineGlossStrategy } from "@/modules/languages/model";
import { useMutation } from "@tanstack/react-query";
import GlossAutocompleteInput from "./GlossAutocompleteInput";

export interface TranslateWordProps {
  verseId: string;
  word: {
    id: string;
    text: string;
    referenceGloss: string | null;
    suggestions: string[];
    machineSuggestion?: string;
  };
  phrase: {
    id: number;
    wordIds: string[];
    gloss?: { text: string; state: GlossStateRaw };
    hasTranslatorNote: boolean;
    hasFootnote: boolean;
  };
  backtranslation: { enabled: boolean; gloss?: string };
  language: {
    code: string;
    font: string;
    textDirection: string;
    isMember: boolean;
    machineGlossStrategy: MachineGlossStrategy;
  };
  isHebrew: boolean;
  wordSelected: boolean;
  phraseFocused: boolean;
  onSelect?(): void;
  onFocus?(): void;
  onShowDetail?(): void;
  onOpenNotes?(): void;
}

export default function TranslateWord({
  verseId,
  word,
  phrase,
  isHebrew,
  language,
  phraseFocused,
  wordSelected,
  backtranslation,
  onSelect,
  onFocus,
  onShowDetail,
  onOpenNotes,
}: TranslateWordProps) {
  const t = useTranslations("TranslateWord");

  const rootRef = useRef<HTMLLIElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasNote =
    phrase.hasFootnote || (phrase.hasTranslatorNote && language.isMember);
  const isMultiWord = (phrase?.wordIds.length ?? 0) > 1;

  const modelGlosses = useMemo(() => {
    if (isMultiWord) return {} as const;

    if (language.machineGlossStrategy === MachineGlossStrategy.Google) {
      return { google: word.machineSuggestion } as const;
    } else if (language.machineGlossStrategy === MachineGlossStrategy.LLM) {
      return { llm_import: word.machineSuggestion } as const;
    } else {
      return {} as const;
    }
  }, [language.machineGlossStrategy, word.machineSuggestion]);

  useEffect(() => {
    if (!phraseFocused || !inputRef.current) return;

    if (inputRef.current !== document.activeElement) {
      inputRef.current.focus();
    }
  }, [phraseFocused]);

  const { mutate, isPending: saving } = useMutation({
    mutationFn: async (gloss: {
      text: string;
      state: GlossStateRaw;
      method?: GlossApprovalMethodRaw;
    }) => {
      const data = {
        languageCode: language.code,
        phraseId: phrase.id,
        state: gloss.state,
        gloss: gloss.text,
        method: gloss.method,
      };

      await updateGlossAction({ data });
    },
    async onSuccess(_data, _variables, _result, { client }) {
      await client.invalidateQueries({
        queryKey: [
          "book-progress",
          parseInt(word.id.slice(0, 2)),
          language.code,
        ],
      });
      await client.invalidateQueries({
        queryKey: ["verse-translation-data", language.code, verseId],
      });
    },
  });

  return (
    <li
      key={word.id}
      ref={rootRef}
      dir={isHebrew ? "rtl" : "ltr"}
      className={`
        relative p-2 rounded grid items-center
        ${phraseFocused && !wordSelected ? "bg-brown-50 dark:bg-gray-800" : ""}
        ${
          wordSelected ?
            "shadow-inner dark:shadow-none bg-brown-100 dark:bg-gray-700"
          : ""
        }
      `}
      style={{
        gridTemplateRows: createWordGrid({
          editable: language.isMember,
          backtranslationEnabled: backtranslation.enabled,
        }),
      }}
      onClick={(e) => {
        if (!e.altKey) return;
        if (!isMultiWord) {
          onSelect?.();
        }
      }}
    >
      <div
        id={`word-${word.id}`}
        className={`
          row-start-1
          flex items-center gap-1.5
          text-start ps-3
          ${language.isMember ? "" : "pe-3"}
        `}
      >
        <span
          className="inline-block font-bold cursor-pointer font-mixed"
          tabIndex={-1}
          onClick={() => {
            onFocus?.();
            onShowDetail?.();
          }}
        >
          {word.text}
        </span>
        {hasNote && (
          <Button
            title={t("open_note_tooltip")}
            small
            variant="tertiary"
            tabIndex={-1}
            onClick={(e: MouseEvent) => {
              if (e.altKey) return;
              onFocus?.();
              onOpenNotes?.();
            }}
          >
            <Icon icon="sticky-note" />
          </Button>
        )}
        <div className="grow" />
        {isMultiWord ?
          <Icon
            title="Linked to another word"
            icon="link"
            className="text-gray-600 dark:text-gray-400"
          />
        : language.isMember && (
            <Checkbox
              aria-label="word selected"
              tabIndex={-1}
              checked={wordSelected}
              onChange={() => onSelect?.()}
              onFocus={() => {
                onFocus?.();
              }}
            />
          )
        }
      </div>
      <div className={`row-start-2 text-start px-3`}>
        <span className="inline-block" dir="ltr">
          {word.referenceGloss}
        </span>
      </div>
      {!language.isMember ?
        <div className={`row-start-3 text-start px-3`}>
          <span className="inline-block" dir={language.textDirection}>
            {phrase.gloss?.text}
          </span>
        </div>
      : <>
          {phrase.wordIds.indexOf(word.id) === 0 && (
            <GlossAutocompleteInput
              ref={inputRef}
              name="gloss"
              aria-labelledby={`word-${word.id}`}
              data-phrase={phrase.id}
              className="-mx-px mt-0.5 place-self-start row-start-3 min-w-[128px]"
              font={fontMap[language.font]}
              dir={language.textDirection}
              right={isHebrew}
              suggestions={word.suggestions}
              modelGlosses={modelGlosses}
              value={phrase?.gloss}
              saving={saving}
              onChange={({ text, state, source }) => {
                mutate({ text, state, method: source });
              }}
              onFocus={() => onFocus?.()}
              onKeyDown={(e) => {
                switch (e.key) {
                  case "Enter": {
                    if (e.altKey && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
                      e.preventDefault();
                      if (!isMultiWord && hasShortcutModifier(e)) {
                        onSelect?.();
                      }
                    } else if (!e.altKey && !e.metaKey && !e.ctrlKey) {
                      if (e.shiftKey) {
                        const prevRoot =
                          rootRef.current?.previousElementSibling;
                        const prev =
                          prevRoot?.querySelector("input:not([type])") ??
                          prevRoot?.querySelector("button");
                        if (prev && prev instanceof HTMLElement) {
                          prev.focus();
                        }
                      } else {
                        const nextRoot = rootRef.current?.nextElementSibling;
                        const next =
                          nextRoot?.querySelector("input:not([type])") ??
                          nextRoot?.querySelector("button");
                        if (next && next instanceof HTMLElement) {
                          next.focus();
                        }
                      }
                    }
                    break;
                  }
                }
              }}
            />
          )}
        </>
      }
      {backtranslation.enabled && (
        <div
          className={`
            row-start-5 italic
            ${isHebrew ? "text-right pr-3" : "text-left pl-3"}
          `}
        >
          <span dir="ltr">{backtranslation.gloss}</span>
        </div>
      )}
    </li>
  );
}

export function createWordGrid({
  editable,
  backtranslationEnabled,
}: {
  editable: boolean;
  backtranslationEnabled: boolean;
}) {
  return [
    "1.75rem",
    "1.75rem",
    ...(editable ? ["3.25rem"] : ["1.75rem"]),
    ...(backtranslationEnabled ? ["1.75rem"] : []),
  ].join(" ");
}
