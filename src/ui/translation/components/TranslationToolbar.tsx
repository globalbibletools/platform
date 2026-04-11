"use client";

import Button from "@/components/Button";
import ComboboxInput from "@/components/ComboboxInput";
import { Icon } from "@/components/Icon";
import TextInput from "@/components/TextInput";
import { useTranslations } from "use-intl";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type JSX,
} from "react";
import { redirectToUnapproved } from "@/ui/translation/serverFns/redirectToUnapproved";
import {
  bookFirstVerseId,
  bookLastVerseId,
  decrementVerseId,
  incrementVerseId,
  parseReference,
} from "@/verse-utils";
import TranslationProgressBar from "./TranslationProgressBar";
import { useFlash } from "@/flash";
import { hasShortcutModifier } from "@/utils/keyboard-shortcuts";
import AudioDialog from "@/modules/study/ui/AudioDialog";
import { useElementDimensions } from "@/utils/measure-element";
import { useServerFn } from "@tanstack/react-start";
import { LanguageReadModel } from "../readModels/getLanguagesReadModel";

export type ActionType =
  | "approveAll"
  | "linkWords"
  | "unlinkPhrase"
  | "sanityCheck";
export interface Action {
  state: "disabled" | "pending" | "active";
  fn: () => void;
}
export type ActionMap = Partial<Record<ActionType, Action>>;

export interface TranslationToolbarProps {
  actions: ActionMap;
  languages: Array<LanguageReadModel>;
  currentLanguage: { isMember: boolean } | null;
  userRoles: string[];
}

export default function TranslationToolbar({
  actions,
  languages,
  currentLanguage,
  userRoles,
}: TranslationToolbarProps) {
  const t = useTranslations("TranslationToolbar");
  const { verseId = "", code = "" } = useParams({ strict: false });
  const navigate = useNavigate();
  const flash = useFlash();

  const redirectToUnapprovedFn = useServerFn(redirectToUnapproved);

  const isTranslator = currentLanguage?.isMember;
  const isPlatformAdmin = userRoles.includes("ADMIN");

  const bookId = parseInt(verseId.slice(0, 2)) || 1;
  const chapter = parseInt(verseId.slice(2, 5)) || 1;
  const verse = parseInt(verseId.slice(5, 8)) || 1;
  const reference = t("verse_reference", { bookId, chapter, verse });

  const navigateToNextUnapprovedVerse = useCallback(async () => {
    try {
      const { nextVerseId } = await redirectToUnapprovedFn({
        data: { verseId, code },
      });
      await navigate({
        to: "/translate/$code/$verseId",
        params: { code, verseId: nextVerseId },
      });
    } catch (error) {
      if (error instanceof Error) {
        flash.success(error.message);
      }
    }
  }, [verseId, code, flash, navigate, redirectToUnapprovedFn]);

  const navigateToVerse = useCallback(
    (nextVerseId: string) => {
      return navigate({
        to: "/translate/$code/$verseId",
        params: { code, verseId: nextVerseId },
      });
    },
    [code, navigate],
  );

  useEffect(() => {
    if (!verseId) return;

    const keydownCallback = async (e: globalThis.KeyboardEvent) => {
      if (e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        switch (e.key) {
          case "a":
            return actions.approveAll?.fn();
          case "n":
            return navigateToNextUnapprovedVerse();
        }
      } else if (hasShortcutModifier(e) && !e.shiftKey && !e.altKey) {
        switch (e.key) {
          case "l":
            return actions.linkWords?.fn();
          case "u":
            return actions.unlinkPhrase?.fn();
          case "ArrowUp":
            return navigateToVerse(decrementVerseId(verseId));
          case "ArrowDown":
            return navigateToVerse(incrementVerseId(verseId));
        }
      } else if (hasShortcutModifier(e) && e.shiftKey && !e.altKey) {
        switch (e.key) {
          case "Home":
            return navigateToVerse(bookFirstVerseId(bookId));
          case "End":
            return navigateToVerse(bookLastVerseId(bookId));
        }
      }
    };

    window.addEventListener("keydown", keydownCallback);
    return () => window.removeEventListener("keydown", keydownCallback);
  }, [
    isTranslator,
    actions.approveAll?.fn,
    actions.linkWords?.fn,
    actions.unlinkPhrase?.fn,
    navigateToNextUnapprovedVerse,
    navigateToVerse,
    bookId,
    verseId,
  ]);

  const [showAudioPlayer, setShowAudioPlayer] = useState(false);

  const [toolbarRef, { blockSize: toolbarHeight }] =
    useElementDimensions<HTMLDivElement>();
  useLayoutEffect(() => {
    document.body.style.setProperty("--translate-nav-h", `${toolbarHeight}px`);
  }, [toolbarHeight]);

  const buttons = [];

  if (actions.approveAll) {
    buttons.push(
      <Button
        key="approve-all"
        variant="tertiary"
        disabled={actions.approveAll.state === "disabled"}
        onClick={actions.approveAll.fn}
      >
        <Icon
          icon={
            actions.approveAll.state === "pending" ? "arrows-rotate" : "check"
          }
          fixedWidth
          className="me-1"
        />
        Approve All
      </Button>,
    );
  }

  if (actions.linkWords) {
    buttons.push(
      <Button
        key="word-linking"
        variant="tertiary"
        disabled={actions.linkWords.state === "disabled"}
        onClick={actions.linkWords.fn}
      >
        <Icon
          icon={
            actions.linkWords.state === "pending" ? "arrows-rotate" : "link"
          }
          fixedWidth
          className="me-1"
        />
        Link Words
      </Button>,
    );
  }
  if (actions.unlinkPhrase) {
    buttons.push(
      <Button
        key="word-linking"
        variant="tertiary"
        disabled={actions.unlinkPhrase.state === "disabled"}
        onClick={actions.unlinkPhrase.fn}
      >
        <Icon
          icon={
            actions.unlinkPhrase.state === "pending" ?
              "arrows-rotate"
            : "unlink"
          }
          fixedWidth
          className="me-1"
        />
        Unlink Words
      </Button>,
    );
  }

  buttons.push(
    <Button
      key="audio"
      variant="tertiary"
      onClick={() => setShowAudioPlayer(true)}
    >
      <Icon icon="circle-play" className="me-1" />
      {t("audio")}
    </Button>,
  );

  if (actions.sanityCheck) {
    buttons.push(
      <Button
        key="sanity-check"
        variant="tertiary"
        disabled={actions.sanityCheck.state === "disabled"}
        onClick={actions.sanityCheck.fn}
      >
        <Icon
          icon={
            actions.sanityCheck.state === "pending" ?
              "arrows-rotate"
            : "clipboard-check"
          }
          fixedWidth
          className="me-1"
        />
        Sanity Check
      </Button>,
    );
  }

  return (
    <>
      <div
        ref={toolbarRef}
        className="
          sticky top-(--heading-height) z-10
          flex flex-wrap gap-y-2 gap-x-10 items-center justify-center
          bg-white dark:bg-gray-900
          shadow-md dark:shadow-none dark:border-b dark:border-gray-700
          px-6 md:px-8 pt-4 pb-5
        "
      >
        <div className="shrink-0 flex items-center">
          <form
            className={isTranslator ? "me-2" : ""}
            onSubmit={async (e) => {
              e.preventDefault();

              const referenceElement =
                e.currentTarget.elements.namedItem("reference");
              if (!(referenceElement instanceof HTMLInputElement)) return;
              const reference = referenceElement.value;

              const verseId = parseReference(reference, t.raw("book_names"));
              if (!verseId) {
                flash.error(`${reference} is not a valid verse`);
                return;
              }

              await navigate({
                to: "/translate/$code/$verseId",
                params: { code, verseId },
              });
            }}
          >
            <input type="hidden" value={code} name="language" />
            <div className="relative">
              <TextInput
                key={verseId}
                className="pe-16 placeholder-current w-56"
                defaultValue={reference}
                name="reference"
                autoComplete="off"
                aria-label={t("verse")}
                onFocus={(e) => e.target.select()}
              />
              <Button
                className="absolute end-8 top-1 w-7 h-7!"
                variant="tertiary"
                to={verseId ? "/translate/$code/$verseId" : "."}
                params={
                  verseId ?
                    { code, verseId: decrementVerseId(verseId) }
                  : undefined
                }
              >
                <Icon icon="arrow-up" />
                <span className="sr-only">{t("previous_verse")}</span>
              </Button>
              <Button
                className="absolute end-1 top-1 w-7 h-7!"
                variant="tertiary"
                to={verseId ? "/translate/$code/$verseId" : "."}
                params={
                  verseId ?
                    { code, verseId: incrementVerseId(verseId) }
                  : undefined
                }
              >
                <Icon icon="arrow-down" />
                <span className="sr-only">{t("next_verse")}</span>
              </Button>
            </div>
          </form>
          <Button
            variant="tertiary"
            disabled={!verseId}
            onClick={navigateToNextUnapprovedVerse}
          >
            {t("next_unapproved")}
            <Icon icon="arrow-right" className="ms-1 rtl:hidden" />
            <Icon icon="arrow-left" className="ms-1 ltr:hidden" />
          </Button>
        </div>
        <div className="shrink-0 flex items-center">
          <ComboboxInput
            aria-label={t("language")}
            items={languages.map((l) => ({
              label: l.englishName,
              value: l.code,
            }))}
            value={code}
            onChange={(nextCode) =>
              navigate({
                to: "/translate/$code/$verseId",
                params: { code: nextCode, verseId: verseId || "01001001" },
              })
            }
            className="w-40"
            autoComplete="off"
          />
          {(isTranslator || isPlatformAdmin) && (
            <Button
              className="ms-2"
              variant="tertiary"
              to="/admin/languages/$code/settings"
              params={{ code }}
            >
              <Icon icon="sliders" className="me-1" />
              {t("manage_language")}
            </Button>
          )}
        </div>
        <div className="flex shrink-0 items-center">
          {buttons.reduce<JSX.Element[]>((elements, el, i) => {
            if (i > 0) {
              elements.push(
                <span
                  key={`separator-${i}`}
                  className="mx-1 dark:text-gray-300"
                  aria-hidden="true"
                >
                  |
                </span>,
              );
            }

            elements.push(el);

            return elements;
          }, [])}
        </div>
        {verseId && (
          <TranslationProgressBar className="absolute bottom-0 left-0 right-0" />
        )}
      </div>
      {showAudioPlayer && (
        <AudioDialog
          className="bottom-12 w-[calc(100%-1rem)] mx-2 sm:w-80 sm:mx-auto"
          verseId={verseId}
          onClose={() => setShowAudioPlayer(false)}
        />
      )}
    </>
  );
}
