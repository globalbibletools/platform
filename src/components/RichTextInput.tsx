import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Icon } from '@/components/Icon';
import {
  ComponentProps,
  forwardRef,
  useEffect,
  useImperativeHandle,
} from 'react';
import { useTranslations } from 'next-intl';

export interface RichTextInputProps {
  name: string;
  value?: string;
  defaultValue?: string;
  onChange?: (newValue: string) => void;
  onBlur?: () => void;
  'aria-labelledby'?: string;
  'aria-label'?: string;
}

export interface RichTextInputRef {
  focus(): void;
}

export const extensions = [
  StarterKit.configure({
    code: false,
    codeBlock: false,
    blockquote: false,
    heading: false,
    horizontalRule: false,
  }),
];

const RichTextInput = forwardRef<RichTextInputRef, RichTextInputProps>(
  ({ name, onChange, onBlur, value, defaultValue, ...props }, ref) => {
    const t = useTranslations('RichTextInput');

    const editor = useEditor({
      extensions,
      editorProps: {
        attributes: {
          class: 'focus:outline-none min-h-[24px] rich-text',
          ...props,
        },
      },
      content: value ?? defaultValue,
      immediatelyRender: false,
      onUpdate: ({ editor }) => onChange?.(editor?.getHTML()),
      onBlur,
    });

    useEffect(() => {
      if (value !== editor?.getHTML()) {
        editor?.commands.setContent(value ?? '', false, {
          preserveWhitespace: 'full',
        });
      }
    }, [value, editor]);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => editor?.commands.focus(),
      }),
      [editor]
    );

    return (
      <div
        className="
        border rounded border-gray-400 has-[:focus-visible]:outline outline-2 outline-green-300 bg-white
        dark:border-gray-500 dark:bg-gray-800
      "
      >
        <div className="border-gray-400 border-b p-1 flex gap-3">
          <div className="flex gap-1">
            <RichTextInputButton
              active={editor?.isActive('bold')}
              disabled={!editor?.can().toggleBold()}
              icon="bold"
              label={t('bold_tooltip')}
              onClick={() => editor?.chain().focus().toggleBold().run()}
            />
            <RichTextInputButton
              active={editor?.isActive('italic')}
              disabled={!editor?.can().toggleItalic()}
              icon="italic"
              label={t('italic_tooltip')}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            />
            <RichTextInputButton
              active={editor?.isActive('strike')}
              disabled={!editor?.can().toggleStrike()}
              icon="strikethrough"
              label={t('strike_tooltip')}
              onClick={() => editor?.chain().focus().toggleStrike().run()}
            />
          </div>
          <div className="flex gap-1">
            <RichTextInputButton
              active={editor?.isActive('bulletList')}
              disabled={!editor?.can().toggleBulletList()}
              icon="list-ul"
              label={t('bullet_list_tooltip')}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            />
            <RichTextInputButton
              active={editor?.isActive('orderedList')}
              disabled={!editor?.can().toggleOrderedList()}
              icon="list-ol"
              label={t('ordered_list_tooltip')}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            />
            <RichTextInputButton
              disabled={!editor?.can().sinkListItem('listItem')}
              icon="indent"
              label={t('indent_tooltip')}
              onClick={() =>
                editor?.chain().focus().sinkListItem('listItem').run()
              }
            />
            <RichTextInputButton
              disabled={!editor?.can().liftListItem('listItem')}
              icon="outdent"
              label={t('outdent_tooltip')}
              onClick={() =>
                editor?.chain().focus().liftListItem('listItem').run()
              }
            />
          </div>
        </div>
        <EditorContent editor={editor} className="py-2 px-3 shadow-inner" />
      </div>
    );
  }
);
RichTextInput.displayName = 'RichTextInput'

export default RichTextInput;

interface RichTextInputButtonProps {
  active?: boolean;
  onClick?(): void;
  disabled?: boolean;
  icon: ComponentProps<typeof Icon>['icon'];
  label: string;
}

function RichTextInputButton({
  active = false,
  disabled = false,
  icon,
  label,
  onClick,
}: RichTextInputButtonProps) {
  return (
    <button
      type="button"
      tabIndex={-1}
      className={`
        w-7 h-7 disabled:text-gray-400 dark:disabled:text-gray-500
        ${active ? 'rounded bg-green-100 dark:bg-green-800' : ''}
      `}
      onClick={onClick}
      disabled={disabled}
      title={label}
    >
      <Icon icon={icon} />
      <span className="sr-only">{label}</span>
    </button>
  );
}

export function isRichTextEmpty(richText: string) {
    return richText === '' || richText === '<p></p>'
}

