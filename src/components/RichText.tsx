"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { extensions } from "./RichTextInput";
import { useEffect } from "react";

export interface RichTextProps {
  className?: string;
  content: string;
}

export default function RichText({ content, className = "" }: RichTextProps) {
  const editor = useEditor({
    extensions,
    editorProps: {
      attributes: {
        class: "rich-text",
      },
    },
    editable: false,
    immediatelyRender: false,
  });

  useEffect(() => {
    if (content !== editor?.getHTML()) {
      editor?.commands.setContent(content, false, {
        preserveWhitespace: "full",
      });
    }
  }, [content, editor]);

  return <EditorContent editor={editor} className={className} />;
}
