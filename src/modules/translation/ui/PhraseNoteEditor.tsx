"use client";

import { Icon } from "@/components/Icon";
import RichText from "@/components/RichText";
import RichTextInput, { RichTextInputRef } from "@/components/RichTextInput";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import throttle from "lodash/throttle";
import { useTranslations } from "next-intl";
import { type RefObject, useEffect, useMemo, useState } from "react";
import { getPhraseNote } from "../actions/getPhraseNote";
import { updateFootnoteAction } from "../actions/updateFootnote";
import { updateTranslatorNoteAction } from "../actions/updateTranslatorNote";

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

  const updateFootnoteFn = useServerFn(updateFootnoteAction);
  const updateTranslatorNoteFn = useServerFn(updateTranslatorNoteAction);
  const getPhraseNoteFn = useServerFn(getPhraseNote);

  const [draftNote, setDraftNote] = useState("");

  const [isDirty, setDirty] = useState(false);

  const { data: note, refetch } = useQuery({
    queryKey: ["phrase-note", phraseId, languageCode, noteType],
    queryFn: () =>
      getPhraseNoteFn({
        data: {
          phraseId,
          languageCode,
          type: noteType,
        },
      }),
  });

  const { mutate, isPending: isSaving } = useMutation({
    mutationFn:
      noteType === "footnote" ? updateFootnoteFn : updateTranslatorNoteFn,
    async onSuccess() {
      await refetch();
    },
  });

  useEffect(() => {
    setDirty(false);
  }, [phraseId, languageCode, noteType]);

  useEffect(() => {
    if (!isDirty) {
      setDraftNote(note?.content ?? "");
    }

    if (isDirty && note?.content === draftNote) {
      setDirty(false);
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
      {canEdit ?
        <RichTextInput
          ref={editorRef}
          name={`${noteType}Content`}
          value={draftNote}
          onBlur={() => saveNote.flush()}
          onChange={(nextContent) => {
            setDirty(true);
            setDraftNote(nextContent);
            saveNote(nextContent);
          }}
        />
      : <RichText content={draftNote} />}
    </div>
  );
}
