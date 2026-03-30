"use client";

import AutocompleteInput from "@/components/AutocompleteInput";
import Button from "@/components/Button";
import Checkbox from "@/components/Checkbox";
import { Icon } from "@/components/Icon";
import { useTextWidth } from "@/utils/text-width";
import { useTranslations } from "use-intl";
import {
  MouseEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { updateGlossAction } from "../actions/updateGloss";
import { fontMap } from "@/fonts";
import { useParams } from "@tanstack/react-router";
import { GlossApprovalMethodRaw } from "../types";
import { hasShortcutModifier } from "@/utils/keyboard-shortcuts";
import { MachineGlossStrategy } from "@/modules/languages/model";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";

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
    gloss?: { text: string; state: string };
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
  const queryClient = useQueryClient();
  const updateGlossFn = useServerFn(updateGlossAction);

  const rootRef = useRef<HTMLLIElement>(null);
  const ancientWordRef = useRef<HTMLSpanElement>(null);
  const refGlossRef = useRef<HTMLSpanElement>(null);
  const targetGlossRef = useRef<HTMLSpanElement>(null);
  const backtranslatedGlossRef = useRef<HTMLSpanElement>(null);
  const llmGlossRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const editable = language.isMember;
  const canViewTranslatorNotes = language.isMember;

  const hasNote =
    phrase.hasFootnote || (phrase.hasTranslatorNote && canViewTranslatorNotes);
  const dir = "ltr";

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

  let approvalMethod: GlossApprovalMethodRaw = GlossApprovalMethodRaw.UserInput;
  if (language.machineGlossStrategy === MachineGlossStrategy.Google) {
    if (word.suggestions[0] && glossValue === word.suggestions[0]) {
      approvalMethod = GlossApprovalMethodRaw.MachineSuggestion;
    } else if (machineSuggestion && glossValue === machineSuggestion) {
      approvalMethod = GlossApprovalMethodRaw.GoogleSuggestion;
    }
  } else if (language.machineGlossStrategy === MachineGlossStrategy.LLM) {
    if (machineSuggestion && glossValue === machineSuggestion) {
      approvalMethod = GlossApprovalMethodRaw.LLMSuggestion;
    } else if (word.suggestions[0] && glossValue === word.suggestions[0]) {
      approvalMethod = GlossApprovalMethodRaw.MachineSuggestion;
    }
  }

  const { code } = useParams({ from: "/_main/translate/$code/$verseId" });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setSaving(false);
  }, [phrase.id]);
  const autosaveQueuedRef = useRef(false);
  async function saveGloss(state: "APPROVED" | "UNAPPROVED") {
    setSaving(true);
    autosaveQueuedRef.current = false;

    const updatedGloss = inputRef.current?.value ?? "";

    const data = {
      languageCode: language.code,
      phraseId: phrase.id,
      state: state,
      gloss: updatedGloss,
      method: GlossApprovalMethodRaw.UserInput as GlossApprovalMethodRaw,
    };

    if (language.machineGlossStrategy === MachineGlossStrategy.Google) {
      if (word.suggestions[0] && updatedGloss === word.suggestions[0]) {
        data.method = GlossApprovalMethodRaw.MachineSuggestion;
      } else if (machineSuggestion && updatedGloss === machineSuggestion) {
        data.method = GlossApprovalMethodRaw.GoogleSuggestion;
      }
    } else if (language.machineGlossStrategy === MachineGlossStrategy.LLM) {
      if (machineSuggestion && updatedGloss === machineSuggestion) {
        data.method = GlossApprovalMethodRaw.LLMSuggestion;
      } else if (word.suggestions[0] && updatedGloss === word.suggestions[0]) {
        data.method = GlossApprovalMethodRaw.MachineSuggestion;
      }
    }

    // TODO: handle errors in the result
    await updateGlossFn({ data });

    await queryClient.invalidateQueries({
      queryKey: ["book-progress", parseInt(word.id.slice(0, 2)), code],
    });
    await queryClient.invalidateQueries({
      queryKey: ["verse-translation-data", code, verseId],
    });

    setSaving(false);
  }

  let status: "empty" | "saving" | "saved" | "approved" = "empty";
  if (saving) {
    status = "saving";
  } else if (phrase?.gloss?.text) {
    status = phrase?.gloss.state === "APPROVED" ? "approved" : "saved";
  }

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
        // The extra 24 pixels accommodates the google icon
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
            <div
              className={`
                            min-w-[128px] flex gap-2 items-center
                            ${isHebrew ? "flex-row" : "flex-row-reverse"}
                        `}
              // The extra 26 pixels give room for the padding and border.
              style={{
                width: width + 26,
              }}
              dir={language.textDirection}
            >
              <div className="group-focus-within/word:block hidden">
                {status !== "approved" && (
                  <Button
                    className="bg-green-600! w-9"
                    tabIndex={-1}
                    title={t("approve_tooltip") ?? ""}
                    disabled={saving}
                    onClick={(e: MouseEvent) => {
                      e.stopPropagation();
                      saveGloss("APPROVED");
                      inputRef.current?.focus();
                    }}
                  >
                    <Icon icon="check" />
                  </Button>
                )}
                {status === "approved" && (
                  <Button
                    className="bg-red-600! w-9"
                    tabIndex={-1}
                    title={t("revoke_tooltip") ?? ""}
                    disabled={saving}
                    onClick={(e: MouseEvent) => {
                      e.stopPropagation();
                      saveGloss("UNAPPROVED");
                      inputRef.current?.focus();
                    }}
                  >
                    <Icon icon="arrow-rotate-left" />
                  </Button>
                )}
              </div>
              <div className="relative grow">
                <AutocompleteInput
                  className={`w-full ${isHebrew ? "text-right" : "text-left"}`}
                  style={{
                    fontFamily: fontMap[language.font],
                  }}
                  data-phrase={phrase.id}
                  data-method={approvalMethod}
                  inputClassName={isHebrew ? "text-right" : "text-left"}
                  right={isHebrew}
                  renderOption={(item, i) => (
                    <div
                      className={
                        machineSuggestion ?
                          `relative ${isHebrew ? "pl-5" : "pr-5"}`
                        : ""
                      }
                    >
                      {item}
                      {i === word.suggestions.length ?
                        <Icon
                          className={`absolute top-1 ${isHebrew ? "left-0" : "right-0"}`}
                          icon={
                            (
                              language.machineGlossStrategy ===
                              MachineGlossStrategy.Google
                            ) ?
                              "google"
                            : "robot"
                          }
                        />
                      : undefined}
                    </div>
                  )}
                  name="gloss"
                  value={glossValue}
                  state={status === "approved" ? "success" : undefined}
                  aria-describedby={`word-help-${word.id}`}
                  aria-labelledby={`word-${word.id}`}
                  onChange={(value) => {
                    autosaveQueuedRef.current = true;
                    setTimeout(() => {
                      if (
                        autosaveQueuedRef.current &&
                        value !== phrase.gloss?.text
                      ) {
                        saveGloss("UNAPPROVED");
                      }
                    }, 200);
                  }}
                  onSelect={() => {
                    saveGloss("APPROVED");

                    const nextRoot = rootRef.current?.nextElementSibling;
                    const next =
                      nextRoot?.querySelector("input:not([type])") ??
                      nextRoot?.querySelector("button");
                    if (next && next instanceof HTMLElement) {
                      next.focus();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.altKey) return;
                    switch (e.key) {
                      case "Enter": {
                        e.preventDefault();
                        if (e.shiftKey) {
                          const prev = rootRef.current?.previousElementSibling;
                          prev?.querySelector("input")?.focus();
                        } else if (hasShortcutModifier(e)) {
                          if (!isMultiWord) {
                            onSelect?.();
                          }
                        } else {
                          setTimeout(() => {
                            saveGloss("APPROVED");
                          });

                          const nextRoot = rootRef.current?.nextElementSibling;
                          const next =
                            nextRoot?.querySelector("input:not([type])") ??
                            nextRoot?.querySelector("button");
                          if (next && next instanceof HTMLElement) {
                            next.focus();
                          }
                        }
                        break;
                      }
                      case "Escape": {
                        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
                          return;

                        saveGloss("UNAPPROVED");
                        break;
                      }
                    }
                  }}
                  onFocus={() => onFocus?.()}
                  suggestions={
                    machineSuggestion ?
                      [...word.suggestions, machineSuggestion]
                    : word.suggestions
                  }
                  ref={inputRef}
                />
                {hasMachineSuggestion && (
                  <Icon
                    className={`absolute top-1/2 -translate-y-1/2 ${isHebrew ? "left-3" : "right-3"}`}
                    icon={
                      (
                        language.machineGlossStrategy ===
                        MachineGlossStrategy.Google
                      ) ?
                        "google"
                      : "robot"
                    }
                  />
                )}
              </div>
            </div>
          )}
          <div
            id={`word-help-${word.id}`}
            className={`
                        text-sm    
                        ${status === "approved" ? "text-green-600" : "text-slate-500"}
                        ${isHebrew ? "text-right" : "text-left"}
                    `}
          >
            {(() => {
              if (status === "saving") {
                return (
                  <>
                    <Icon icon="arrows-rotate" className="me-1" />
                    <span dir={dir}>{t("saving")}</span>
                  </>
                );
              } else if (status === "approved") {
                return (
                  <>
                    <Icon icon="check" className="me-1" />
                    <span dir={dir}>{t("approved")}</span>
                  </>
                );
              } else {
                return null;
              }
            })()}
          </div>
        </>
      }
      {!!backtranslation && (
        <div
          className={`h-8 italic ${
            isHebrew ? "text-right pr-3" : "text-left pl-3"
          }`}
          dir="ltr"
        >
          <span className="inline-block" ref={backtranslatedGlossRef}>
            {backtranslation}
          </span>
        </div>
      )}
    </li>
  );
}
