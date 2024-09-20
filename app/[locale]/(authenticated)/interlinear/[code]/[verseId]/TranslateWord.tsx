"use client";

import AutocompleteInput from "@/app/components/AutocompleteInput";
import Button from "@/app/components/Button";
import Checkbox from "@/app/components/Checkbox";
import { Icon } from "@/app/components/Icon";
import { useTextWidth } from "@/app/utils/text-width";
import { useTranslations } from "next-intl";
import { MouseEvent, useLayoutEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { updateGloss } from "./actions";
import { fontMap } from "@/app/fonts";
import { isRichTextEmpty } from "@/app/components/RichTextInput";
import { useSWRConfig } from "swr";
import { useParams } from "next/navigation";

export interface TranslateWordProps {
    word: { id: string, text: string, referenceGloss?: string, suggestions: string[], machineSuggestion?: string }
    phrase: { id: number, wordIds: string[], gloss?: { text: string, state: string }, translatorNote?: { authorName: string, timestamp: string, content: string }, footnote?: { authorName: string, timestamp: string, content: string } }
    language: {
        font: string
        textDirection: string
        roles: string[]
    }
    isHebrew: boolean
    wordSelected: boolean
    phraseFocused: boolean
    onSelect?(): void
    onFocus?(): void
    onShowDetail?(): void
    onOpenNotes?(): void
}

export default function TranslateWord({ word, phrase, isHebrew, language, phraseFocused, wordSelected, onSelect, onFocus, onShowDetail, onOpenNotes }: TranslateWordProps) {
    const t = useTranslations("TranslateWord")
    const { mutate } = useSWRConfig()

    const root = useRef<HTMLLIElement>(null)
    const ancientWord = useRef<HTMLSpanElement>(null)
    const refGloss = useRef<HTMLSpanElement>(null)
    const input = useRef<HTMLInputElement>(null)

    const editable = language.roles.includes('TRANSLATOR')
    const canViewTranslatorNotes = language.roles.includes('VIEWER')

    const hasNote = !isRichTextEmpty(phrase.footnote?.content ?? '') ||
        (!isRichTextEmpty(phrase.translatorNote?.content ?? '') && canViewTranslatorNotes)
    const dir = 'ltr'


    const isMultiWord = (phrase?.wordIds.length ?? 0) > 1;
    const hasMachineSuggestion =
          !isMultiWord &&
         !phrase.gloss?.text &&
         word.suggestions.length === 0 &&
         !!word.machineSuggestion
    const glossValue =
        phrase?.gloss?.text ||
        (isMultiWord
            ? undefined
            : word.suggestions[0] || word.machineSuggestion);
    const [currentInputValue, setCurrentInputValue] = useState(
        glossValue ?? ''
    );

    const { locale, code } = useParams<{ locale: string, code: string }>()
    const [saving, setSaving] = useState(false)
    async function onChange(change: { state?: string; gloss?: string }) {
        setSaving(true)
        const formData = new FormData()
        formData.set('phraseId', phrase.id.toString())
        if (typeof change.state === 'string') {
            formData.set('state', change.state.toString())
        }
        if (typeof change.gloss === 'string') {
            formData.set('gloss', change.gloss)
        }
        // TODO: handle errors in this result
        const _result = await updateGloss(formData)
        mutate({
            type: 'book-progress',
            bookId: parseInt(word.id.slice(0, 2)),
            locale,
            code
        })
        setSaving(false)
    }

    let status: 'empty' | 'saving' | 'saved' | 'approved' = 'empty';
    if (saving) {
        status = 'saving';
    } else if (phrase?.gloss?.text) {
        status =
            phrase?.gloss.state === 'APPROVED' ? 'approved' : 'saved';
    }

    const [width, setWidth] = useState(0);
    const glossWidth = useTextWidth({
        text: glossValue ?? '',
        fontFamily: fontMap[language.font],
        fontSize: '16px',
    });
    useLayoutEffect(() => {
        setWidth(
            Math.max(
                // The first 24 pixels accommodates the checkbox and link icon for phrases.
                // The extra 36 pixels accommodates the sticky note icon
                24 + (hasNote ? 36 : 0) + (ancientWord.current?.clientWidth ?? 0),
                refGloss.current?.clientWidth ?? 0,
                // The extra 24 pixels accommodates the google icon
                // The extra 48 pixels accommodates the approval button
                glossWidth + (hasMachineSuggestion ? 24 : 0) + 44
            )
        );
    }, [hasNote, glossWidth, hasMachineSuggestion, isMultiWord]);

    return <li
        key={word.id}
        ref={root}
        dir={isHebrew ? 'rtl' : 'ltr'}
        className={`
          group/word relative p-2 rounded
          ${phraseFocused && !wordSelected ? 'bg-brown-50 dark:bg-gray-700' : ''}
          ${wordSelected
                ? 'shadow-inner dark:shadow-none bg-brown-100 dark:bg-gray-600'
                : ''
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
                ${isHebrew ? 'text-right pr-3' : 'text-left pl-3'}
            `}
        >
            <span
                className="inline-block"
                ref={ancientWord}
                tabIndex={-1}
                onClick={() => {
                    onFocus?.();
                    onShowDetail?.();
                }}
            >
                {word.text}
            </span>
            <Button
                className={hasNote ? 'inline-block' : 'hidden'}
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
            <div className="flex-grow" />
            {isMultiWord ? (
                <Icon
                    title="Linked to another word"
                    icon="link"
                    className="text-gray-600 dark:text-gray-400"
                />
            ) : (
                editable && <Checkbox
                    className="invisible group-hover/word:visible group-focus-within/word:visible [&:has(:checked)]:visible"
                    aria-label="word selected"
                    tabIndex={-1}
                    checked={wordSelected}
                    onChange={() => onSelect?.()}
                    onFocus={() => {
                        onFocus?.();
                        onShowDetail?.();
                    }}
                />
            )}

        </div>
        <div
            className={`h-8 ${isHebrew ? 'text-right pr-3' : 'text-left pl-3'
                }`}
            dir="ltr"
        >
            <span className="inline-block" ref={refGloss}>
                {editable ? word.referenceGloss : phrase?.gloss?.text}
            </span>
        </div>
        {editable && (
            <>
                <div
                    className={`
                        min-w-[128px] group/input-row flex gap-2 items-center
                        ${isHebrew ? 'flex-row' : 'flex-row-reverse'}
                    `}
                    // The extra 26 pixels give room for the padding and border.
                    style={{
                        width: width + 26,
                    }}
                    dir={language.textDirection}
                >
                    <div className="group-focus-within/input-row:block hidden">
                        {currentInputValue && status !== 'approved' && (
                            <Button
                                className="!bg-green-600 w-9"
                                tabIndex={-1}
                                title={t('approve_tooltip') ?? ''}
                                disabled={saving}
                                onClick={(e: MouseEvent) => {
                                    e.stopPropagation();
                                    if (status === 'saved') {
                                        onChange({ state: 'APPROVED' });
                                    } else {
                                        onChange({ state: 'APPROVED', gloss: glossValue });
                                    }
                                    input.current?.focus();
                                }}
                            >
                                <Icon icon="check" />
                            </Button>
                        )}
                        {status === 'approved' && (
                            <Button
                                className="!bg-red-600 w-9"
                                tabIndex={-1}
                                title={t('revoke_tooltip') ?? ''}
                                disabled={saving}
                                onClick={(e: MouseEvent) => {
                                    e.stopPropagation();
                                    onChange({ state: 'UNAPPROVED' });
                                    input.current?.focus();
                                }}
                            >
                                <Icon icon="arrow-rotate-left" />
                            </Button>
                        )}
                    </div>
                    <div className="relative grow">
                        <AutocompleteInput
                            className={`w-full ${isHebrew ? 'text-right' : 'text-left'}`}
                            style={{
                                fontFamily: fontMap[language.font]
                            }}
                            data-phrase={phrase.id}
                            inputClassName={isHebrew ? 'text-right' : 'text-left'}
                            right={isHebrew}
                            renderOption={(item, i) => (
                                <div
                                    className={
                                        word.machineSuggestion
                                            ? `relative ${isHebrew ? 'pl-5' : 'pr-5'}`
                                            : ''
                                    }
                                >
                                    {item}
                                    {i === word.suggestions.length ? (
                                        <Icon
                                            className={`absolute top-1 ${isHebrew ? 'left-0' : 'right-0'}`}
                                            icon={['fab', 'google']}
                                        />
                                    ) : undefined}
                                </div>
                            )}
                            name="gloss"
                            value={glossValue}
                            state={status === 'approved' ? 'success' : undefined}
                            aria-describedby={`word-help-${word.id}`}
                            aria-labelledby={`word-${word.id}`}
                            onChange={(value, implicit) => {
                                if (
                                    value !== phrase?.gloss?.text ||
                                    (!implicit && status !== 'approved')
                                ) {
                                    onChange({
                                        gloss: value,
                                        state: !implicit && !!value ? 'APPROVED' : 'UNAPPROVED',
                                    });
                                }
                            }}
                            onInput={(event) => {
                                setCurrentInputValue(
                                    (event.target as HTMLInputElement).value
                                );
                            }}
                            onKeyDown={(e) => {
                                if (e.metaKey || e.altKey) return;
                                switch (e.key) {
                                    case 'Enter': {
                                        e.preventDefault();
                                        if (e.shiftKey) {
                                            const prev = root.current?.previousElementSibling;
                                            prev?.querySelector('input')?.focus();
                                        } else if (e.ctrlKey) {
                                            if (!isMultiWord) {
                                                onSelect?.();
                                            }
                                        } else {
                                            const nextRoot = root.current?.nextElementSibling;
                                            const next =
                                                nextRoot?.querySelector('input:not([type])') ??
                                                nextRoot?.querySelector('button');
                                            if (next && next instanceof HTMLElement) {
                                                next.focus();
                                            }
                                        }
                                        break;
                                    }
                                    case 'Escape': {
                                        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
                                            return;
                                        onChange({ state: 'UNAPPROVED' });
                                        break;
                                    }
                                }
                            }}
                            onFocus={() => onFocus?.()}
                            suggestions={
                                word.machineSuggestion
                                    ? [...word.suggestions, word.machineSuggestion]
                                    : word.suggestions
                            }
                            ref={input}
                        />
                        {hasMachineSuggestion && (
                            <Icon
                                className={`absolute top-1/2 -translate-y-1/2 ${isHebrew ? 'left-3' : 'right-3'}`}
                                icon={['fab', 'google']}
                            />
                        )}
                    </div>
                </div>
                <div
                    id={`word-help-${word.id}`}
                    className={`
                        text-sm    
                        ${status === 'approved' ? 'text-green-600' : 'text-slate-500'}
                        ${isHebrew ? 'text-right' : 'text-left'}
                    `}
                >
                    {(() => {
                        if (status === 'saving') {
                            return (
                                <>
                                    <Icon icon="arrows-rotate" className="me-1" />
                                    <span dir={dir}>{t('saving')}</span>
                                </>
                            );
                        } else if (status === 'approved') {
                            return (
                                <>
                                    <Icon icon="check" className="me-1" />
                                    <span dir={dir}>{t('approved')}</span>
                                </>
                            );
                        } else {
                            return null;
                        }
                    })()}
                </div>
            </>
        )}
    </li>
}
