import Button from "@/components/Button";
import Checkbox from "@/components/Checkbox";
import { Icon } from "@/components/Icon";
import { useTextWidth } from "@/utils/text-width";
import { useTranslations } from "use-intl";
import {
  MouseEvent,
  ReactNode,
  Ref,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { updateGlossAction } from "@/modules/translation/actions/updateGloss";
import { fontMap } from "@/fonts";
import { useParams } from "@tanstack/react-router";
import {
  GlossApprovalMethodRaw,
  GlossStateRaw,
} from "@/modules/translation/types";
import { hasShortcutModifier } from "@/utils/keyboard-shortcuts";
import { MachineGlossStrategy } from "@/modules/languages/model";
import { useMutation } from "@tanstack/react-query";
import GlossAutocompleteInput from "./GlossAutocompleteInput";
import Gloss from "@/modules/translation/model/Gloss";

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
  backtranslation?: string;
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

  const editable = language.isMember;
  const canViewTranslatorNotes = language.isMember;

  const rootRef = useRef<HTMLLIElement>(null);
  const ancientWordRef = useRef<HTMLSpanElement>(null);
  const refGlossRef = useRef<HTMLSpanElement>(null);
  const targetGlossRef = useRef<HTMLSpanElement>(null);
  const backtranslatedGlossRef = useRef<HTMLSpanElement>(null);
  const llmGlossRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!phraseFocused || !inputRef.current) return;

    if (inputRef.current !== document.activeElement) {
      inputRef.current.focus();
    }
  }, [phraseFocused]);

  const hasNote =
    phrase.hasFootnote || (phrase.hasTranslatorNote && canViewTranslatorNotes);

  const isMultiWord = (phrase?.wordIds.length ?? 0) > 1;
  const machineSuggestion =
    language.machineGlossStrategy === MachineGlossStrategy.None ?
      undefined
    : word.machineSuggestion;
  const hasMachineSuggestion =
    !isMultiWord &&
    !phrase.gloss?.text &&
    (language.machineGlossStrategy === MachineGlossStrategy.LLM ||
      word.suggestions.length === 0) &&
    !!machineSuggestion;
  const glossValue =
    phrase?.gloss?.text ||
    (isMultiWord ? undefined : word.suggestions[0] || machineSuggestion);

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
        queryKey: ["book-progress", parseInt(word.id.slice(0, 2)), code],
      });
      await client.invalidateQueries({
        queryKey: ["verse-translation-data", code, verseId],
      });
    },
  });

  const { code } = useParams({ from: "/_main/translate/$code/$verseId" });

  const [width, setWidth] = useState(0);
  const glossWidth = useTextWidth({
    text: glossValue ?? "",
    fontFamily: fontMap[language.font],
    fontSize: "16px",
  });
  useLayoutEffect(() => {
    setWidth(
      Math.max(
        // The first 24 pixels accommodates the checkbox and link icon for phrases.
        // The extra 36 pixels accommodates the sticky note icon
        24 + (hasNote ? 36 : 0) + (ancientWordRef.current?.clientWidth ?? 0),
        // The extra 24 pixels accommodates the robot icon
        // The extra 48 pixels accommodates the approval button
        glossWidth + (editable ? (hasMachineSuggestion ? 24 : 0) + 44 : 0),

        refGlossRef.current?.clientWidth ?? 0,
        targetGlossRef.current?.clientWidth ?? 0,
        backtranslatedGlossRef.current?.clientWidth ?? 0,
        llmGlossRef.current?.clientWidth ?? 0,
      ),
    );
  }, [hasNote, glossWidth, hasMachineSuggestion, isMultiWord, editable]);

  return (
    <li
      key={word.id}
      ref={rootRef}
      dir={isHebrew ? "rtl" : "ltr"}
      className={`
          group/word relative p-2 rounded
          ${phraseFocused && !wordSelected ? "bg-brown-50 dark:bg-gray-800" : ""}
          ${
            wordSelected ?
              "shadow-inner dark:shadow-none bg-brown-100 dark:bg-gray-700"
            : ""
          }
        `}
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
                flex items-center gap-1.5 h-8 cursor-pointer font-mixed
                ${isHebrew ? "text-right pr-3" : "text-left pl-3"}
            `}
      >
        <span
          className="inline-block"
          ref={ancientWordRef}
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
              onShowDetail?.();
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
        : editable && (
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
      <div
        className={`h-8 ${isHebrew ? "text-right pr-3" : "text-left pl-3"}`}
        dir="ltr"
      >
        <span className="inline-block" ref={refGlossRef}>
          {word.referenceGloss}
        </span>
      </div>
      {!editable ?
        <div
          className={`h-8 ${isHebrew ? "text-right pr-3" : "text-left pl-3"}`}
          dir={language.textDirection}
        >
          <span className="inline-block" ref={targetGlossRef}>
            {phrase.gloss?.text}
          </span>
        </div>
      : <>
          {phrase.wordIds.indexOf(word.id) === 0 && (
            <GlossAutocompleteInput
              ref={inputRef}
              name="gloss"
              aria-describedby={`word-help-${word.id}`}
              aria-labelledby={`word-${word.id}`}
              data-phrase={phrase.id}
              className="min-w-[128px]"
              style={{
                fontFamily: fontMap[language.font],
                width: width + 26,
              }}
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
          <GlossDescription
            id={`word-help-${word.id}`}
            right={isHebrew}
            glossState={phrase.gloss?.state ?? GlossStateRaw.Unapproved}
            saving={saving}
          />
        </>
      }
      {!!backtranslation && (
        <BackTranslation right={isHebrew} ref={backtranslatedGlossRef}>
          {backtranslation}
        </BackTranslation>
      )}
    </li>
  );
}

function BackTranslation({
  ref,
  right,
  children,
}: {
  ref: Ref<HTMLSpanElement>;
  right: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`h-8 italic ${right ? "text-right pr-3" : "text-left pl-3"}`}
      dir="ltr"
    >
      <span className="inline-block" ref={ref}>
        {children}
      </span>
    </div>
  );
}

function GlossDescription({
  id,
  glossState,
  right,
  saving,
}: {
  id: string;
  glossState: GlossStateRaw;
  right: boolean;
  saving: boolean;
}) {
  return (
    <div
      id={id}
      className={`
        text-sm h-5
        ${glossState === GlossStateRaw.Approved ? "text-green-600" : "text-slate-500"}
        ${right ? "text-right" : "text-left"}
      `}
    >
      {(() => {
        if (saving) {
          return (
            <>
              <Icon icon="arrows-rotate" className="me-1" />
              <span dir="ltr">Saving</span>
            </>
          );
        } else if (glossState === GlossStateRaw.Approved) {
          return (
            <>
              <Icon icon="check" className="me-1" />
              <span dir="ltr">Approved</span>
            </>
          );
        } else {
          return null;
        }
      })()}
    </div>
  );
}
