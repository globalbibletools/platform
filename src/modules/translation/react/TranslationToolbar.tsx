"use client";

import Button from "@/components/Button";
import ComboboxInput from "@/components/ComboboxInput";
import { Icon } from "@/components/Icon";
import TextInput from "@/components/TextInput";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type JSX,
} from "react";
import { approveAll } from "../actions/approveAll";
import { changeInterlinearLocation } from "../actions/changeInterlinearLocation";
import { linkWords } from "../actions/linkWords";
import { redirectToUnapproved } from "../actions/redirectToUnapproved";
import { sanityCheck } from "../actions/sanityCheck";
import { unlinkPhrase } from "../actions/unlinkPhrase";
import {
  bookFirstVerseId,
  bookLastVerseId,
  decrementVerseId,
  incrementVerseId,
} from "@/verse-utils";
import { useTranslationClientState } from "./TranslationClientState";
import TranslationProgressBar from "./TranslationProgressBar";
import { useSWRConfig } from "swr";
import { useFlash } from "@/flash";
import { hasShortcutModifier } from "@/utils/keyboard-shortcuts";
import AudioDialog from "@/modules/study/react/AudioDialog";
import { useElementDimensions } from "@/utils/measure-element";

export interface TranslationToolbarProps {
  languages: { englishName: string; localName: string; code: string }[];
  currentLanguage: { isMember: boolean } | null;
  userRoles: string[];
}

export default function TranslationToolbar({
  languages,
  currentLanguage,
  userRoles,
}: TranslationToolbarProps) {
  const t = useTranslations("TranslationToolbar");
  const { verseId, code, locale } = useParams<{
    locale: string;
    code: string;
    verseId: string;
  }>();
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const flash = useFlash();

  const isTranslator = currentLanguage?.isMember;
  const isPlatformAdmin = userRoles.includes("ADMIN");

  const {
    selectedWords,
    focusedPhrase,
    clearSelectedWords,
    setBacktranslations,
  } = useTranslationClientState();
  const canLinkWords = selectedWords.length > 1;
  const canUnlinkWords = (focusedPhrase?.wordIds.length ?? 0) > 1;

  const [reference, setReference] = useState("");
  useEffect(() => {
    if (!verseId) return setReference("");

    const bookId = parseInt(verseId.slice(0, 2)) || 1;
    const chapter = parseInt(verseId.slice(2, 5)) || 1;
    const verse = parseInt(verseId.slice(5, 8)) || 1;
    setReference(t("verse_reference", { bookId, chapter, verse }));
  }, [verseId, t]);

  const navigateToNextUnapprovedVerse = useCallback(async () => {
    const form = new FormData();
    form.set("verseId", verseId);
    form.set("code", code);
    const error = await redirectToUnapproved(form);
    if (error) {
      flash.success(error);
    }
  }, [verseId, code]);

  const approveAllGlosses = useCallback(async () => {
    const inputs = document.querySelectorAll("[data-phrase]");
    const form = new FormData();
    form.set("code", code);
    form.set("verseId", verseId);
    let idx = 0;
    inputs.forEach((input) => {
      const phraseId = (input as HTMLInputElement).dataset.phrase;
      const gloss = (input as HTMLInputElement).value;
      const method = (input as HTMLInputElement).dataset.method;

      if (phraseId && gloss) {
        form.set(`phrases[${idx}][id]`, phraseId);
        form.set(`phrases[${idx}][gloss]`, gloss);
        if (method) {
          form.set(`phrases[${idx}][method]`, method);
        }
        idx++;
      }
    });

    await approveAll(form);
    await mutate({
      type: "book-progress",
      bookId: parseInt(verseId.slice(0, 2)),
      locale,
      code,
    });
  }, [code, mutate, locale, verseId]);

  const onLinkWords = useCallback(async () => {
    const form = new FormData();
    form.set("code", code);
    form.set("verseId", verseId);
    selectedWords.forEach((wordId, i) => {
      form.set(`wordIds[${i}]`, wordId);
    });
    clearSelectedWords();
    await linkWords(form);
    await mutate({
      type: "book-progress",
      bookId: parseInt(verseId.slice(0, 2)),
      locale,
      code,
    });
  }, [code, selectedWords, clearSelectedWords, locale, mutate, verseId]);

  const onUnlinkWords = useCallback(async () => {
    if (focusedPhrase) {
      const form = new FormData();
      form.set("code", code);
      form.set("phraseId", focusedPhrase.id.toString());
      form.set("verseId", verseId);
      unlinkPhrase(form);
      await mutate({
        type: "book-progress",
        bookId: parseInt(verseId.slice(0, 2)),
        locale,
        code,
      });
    }
  }, [code, focusedPhrase, verseId, locale, mutate]);

  const [runningSanityCheck, setRunningSanityCheck] = useState(false);
  const onSanityCheck = useCallback(async () => {
    const form = new FormData();
    form.set("code", code);
    form.set("verseId", verseId);
    setRunningSanityCheck(true);
    const result = await sanityCheck({ state: "idle" }, form);
    if (result.state === "error" && result.error) {
      flash.error(result.error);
    } else if (result.state === "success" && result.data) {
      setBacktranslations(result.data);
    }
    setRunningSanityCheck(false);
  }, [code, verseId]);

  useEffect(() => {
    if (!verseId) return;

    const keydownCallback = async (e: globalThis.KeyboardEvent) => {
      if (e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        switch (e.key) {
          case "a":
            return isTranslator && approveAllGlosses();
          case "n":
            return isTranslator && navigateToNextUnapprovedVerse();
        }
      } else if (hasShortcutModifier(e) && !e.shiftKey && !e.altKey) {
        switch (e.key) {
          case "l":
            return isTranslator && onLinkWords();
          case "u":
            return isTranslator && onUnlinkWords();
          case "ArrowUp":
            return router.push(`./${decrementVerseId(verseId)}`);
          case "ArrowDown":
            return router.push(`./${incrementVerseId(verseId)}`);
        }
      } else if (hasShortcutModifier(e) && e.shiftKey && !e.altKey) {
        switch (e.key) {
          case "Home":
            return router.push(
              `./${bookFirstVerseId(parseInt(verseId.slice(0, 2)))}`,
            );
          case "End":
            return router.push(
              `./${bookLastVerseId(parseInt(verseId.slice(0, 2)))}`,
            );
        }
      }
    };

    window.addEventListener("keydown", keydownCallback);
    return () => window.removeEventListener("keydown", keydownCallback);
  }, [
    isTranslator,
    navigateToNextUnapprovedVerse,
    approveAllGlosses,
    onLinkWords,
    onUnlinkWords,
    router,
    verseId,
  ]);

  const [showAudioPlayer, setShowAudioPlayer] = useState(false);

  const [toolbarRef, { blockSize: toolbarHeight }] = useElementDimensions();
  useLayoutEffect(() => {
    document.body.style.setProperty("--translate-nav-h", `${toolbarHeight}px`);
  }, [toolbarHeight]);

  const buttons = [];

  if (isTranslator) {
    buttons.push(
      <Button
        key="approve-all"
        variant="tertiary"
        disabled={!verseId}
        onClick={approveAllGlosses}
      >
        <Icon icon="check" className="me-1" />
        {t("approve_all")}
      </Button>,
    );

    if (!canUnlinkWords || canLinkWords) {
      buttons.push(
        <Button
          key="word-linking"
          variant="tertiary"
          disabled={!canLinkWords || !verseId}
          onClick={onLinkWords}
        >
          <Icon icon="link" className="me-1" />
          {t("link_words")}
        </Button>,
      );
    } else {
      <Button
        key="word-linking"
        variant="tertiary"
        disabled={!verseId}
        onClick={onUnlinkWords}
      >
        <Icon icon="unlink" className="me-1" />
        {t("unlink_words")}
      </Button>;
    }
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

  if (isPlatformAdmin) {
    buttons.push(
      <Button
        key="sanity-check"
        variant="tertiary"
        disabled={!verseId}
        onClick={onSanityCheck}
      >
        <Icon
          icon={runningSanityCheck ? "arrows-rotate" : "clipboard-check"}
          className="me-1"
        />
        {t("sanity_check")}
      </Button>,
    );
  }

  return (
    <>
      <div
        ref={toolbarRef}
        className="
          sticky top-[--heading-height] z-10
          flex items-center flex-wrap gap-y-2 gap-x-10 items-center justify-center
          bg-white dark:bg-gray-900
          shadow-md dark:shadow-none dark:border-b dark:border-gray-700
          px-6 md:px-8 pt-4 pb-5
        "
      >
        <div className="flex-shrink-0 flex items-center">
          <form
            action={changeInterlinearLocation}
            className={isTranslator ? "me-2" : ""}
          >
            <input type="hidden" value={code} name="language" />
            <div className="relative">
              <TextInput
                className="pe-16 placeholder-current w-56"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                name="reference"
                autoComplete="off"
                aria-label={t("verse")}
                onFocus={(e) => e.target.select()}
              />
              <Button
                className="absolute end-8 top-1 w-7 !h-7"
                variant="tertiary"
                href={verseId ? `./${decrementVerseId(verseId)}` : "#"}
              >
                <Icon icon="arrow-up" />
                <span className="sr-only">{t("previous_verse")}</span>
              </Button>
              <Button
                className="absolute end-1 top-1 w-7 !h-7"
                variant="tertiary"
                href={verseId ? `./${incrementVerseId(verseId)}` : "#"}
                prefetch
              >
                <Icon icon="arrow-down" />
                <span className="sr-only">{t("next_verse")}</span>
              </Button>
            </div>
          </form>
          {isTranslator && (
            <div>
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
          )}
        </div>
        <div className="flex-shrink-0 flex">
          <ComboboxInput
            aria-label={t("language")}
            items={languages.map((l) => ({
              label: l.englishName,
              value: l.code,
            }))}
            value={code}
            onChange={(code) => router.push(`../${code}/${verseId}`)}
            className="w-40"
            autoComplete="off"
          />
          {(isTranslator || isPlatformAdmin) && (
            <Button
              className="ms-2"
              variant="tertiary"
              href={`/admin/languages/${code}/settings`}
            >
              <Icon icon="sliders" className="me-1" />
              {t("manage_language")}
            </Button>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center">
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
