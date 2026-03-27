"use client";

import { Icon } from "@/components/Icon";
import type { RichTextInputRef } from "@/components/RichTextInput";
import { useMutation, useQuery } from "@tanstack/react-query";
import throttle from "lodash/throttle";
import { useTranslations } from "use-intl";
import React, {
  type RefObject,
  useEffect,
  useMemo,
  useState,
  Suspense,
} from "react";
import { getPhraseNote } from "../actions/getPhraseNote";
import { updateFootnoteAction } from "../actions/updateFootnote";
import { updateTranslatorNoteAction } from "../actions/updateTranslatorNote";
import LoadingSpinner from "@/components/LoadingSpinner";

const RichText = React.lazy(() => import("@/components/RichText"));
const RichTextInput = React.lazy(() => import("@/components/RichTextInput"));

interface PhraseNoteEditorProps {
  phraseId: number;
  languageCode: string;
  canEdit: boolean;
  canReadMetadata: boolean;
  noteType: "footnote" | "translatorNote";
  title: string;
  editorRef?: RefObject<RichTextInputRef | null>;
}

export default function PhraseNoteEditor({
  phraseId,
  languageCode,
  canEdit,
  canReadMetadata,
  noteType,
  title,
  editorRef,
}: PhraseNoteEditorProps) {
  const t = useTranslations("TranslationSidebar");

  const [draftNote, setDraftNote] = useState("");

  const [isDirty, setIsDirty] = useState(false);

  const { data: note, refetch } = useQuery({
    queryKey: ["phrase-note", phraseId, languageCode, noteType],
    queryFn: () =>
      getPhraseNote({
        data: {
          phraseId,
          languageCode,
          type: noteType,
        },
      }),
  });

  const { mutate, isPending: isSaving } = useMutation({
    mutationFn:
      noteType === "footnote" ? updateFootnoteAction : (
        updateTranslatorNoteAction
      ),
    async onSuccess() {
      await refetch();
    },
  });

  useEffect(() => {
    setIsDirty(false);
  }, [phraseId, languageCode, noteType]);

  useEffect(() => {
    if (!isDirty) {
      setDraftNote(note?.content ?? "");
    }

    if (isDirty && note?.content === draftNote) {
      setIsDirty(false);
    }
  }, [isDirty, note, draftNote]);

  const saveNote = useMemo(
    () =>
      throttle(
        async (nextNote: string) => {
          if (!phraseId) {
            return;
          }

          const data = {
            phraseId,
            note: nextNote,
            languageCode,
          };

          mutate({ data });
        },
        5000,
        { leading: false, trailing: true },
      ),
    [languageCode, phraseId, mutate],
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row gap-2.5">
        <h2 className="font-bold">{title}</h2>
        {isSaving && (
          <span className="italic">
            <Icon icon="save" /> {t("notes.saving")}
          </span>
        )}
      </div>
      {canReadMetadata && note && (
        <span className="italic">
          {t("notes.note_description", {
            timestamp: note?.timestamp.toLocaleString(),
            authorName: note?.authorName ?? "",
          })}
        </span>
      )}
      <Suspense fallback={<LoadingSpinner />}>
        {canEdit ?
          <RichTextInput
            ref={editorRef}
            name={`${noteType}Content`}
            value={draftNote}
            onBlur={() => saveNote.flush()}
            onChange={(nextContent) => {
              setIsDirty(true);
              setDraftNote(nextContent);
              saveNote(nextContent);
            }}
          />
        : <RichText content={draftNote} />}
      </Suspense>
    </div>
  );
}
