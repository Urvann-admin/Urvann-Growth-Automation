'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hasError?: boolean;
  className?: string;
  minHeight?: string;
}

function Toolbar({ editor, hasError }: { editor: Editor | null; hasError: boolean }) {
  if (!editor) return null;

  const btn = 'p-1.5 rounded text-slate-600 hover:bg-slate-200 hover:text-[#E6007A] data-[active=true]:bg-[#E6007A]/10 data-[active=true]:text-[#E6007A]';
  return (
    <div
      className={`flex flex-wrap items-center gap-0.5 border border-slate-200 border-b-0 rounded-t-lg bg-slate-50 p-1.5 ${hasError ? 'border-red-300' : ''}`}
      data-editor-toolbar
    >
      <select
        className="mr-1 rounded border-0 bg-transparent text-sm text-slate-600 focus:ring-0"
        value={editor.getAttributes('heading').level || ''}
        onChange={(e) => {
          const v = e.target.value;
          if (v === '') editor.chain().focus().setParagraph().run();
          else editor.chain().focus().toggleHeading({ level: Number(v) as 1 | 2 | 3 }).run();
        }}
      >
        <option value="">Paragraph</option>
        <option value="1">H1</option>
        <option value="2">H2</option>
        <option value="3">H3</option>
      </select>
      <button type="button" className={btn} data-active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
        <strong>B</strong>
      </button>
      <button type="button" className={btn} data-active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
        <em>I</em>
      </button>
      <button type="button" className={btn} data-active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
        <u>U</u>
      </button>
      <button type="button" className={btn} data-active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
        <s>S</s>
      </button>
      <span className="mx-1 h-4 w-px bg-slate-200" />
      <button type="button" className={btn} data-active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">
        •
      </button>
      <button type="button" className={btn} data-active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">
        1.
      </button>
      <button type="button" className={btn} data-active={editor.isActive('link')} onClick={() => editor.chain().focus().toggleLink({ href: '' }).run()} title="Link">
        Link
      </button>
      <button type="button" className={btn} onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Clear formatting">
        Clear
      </button>
    </div>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write here...',
  hasError = false,
  className = '',
  minHeight = '140px',
}: RichTextEditorProps) {
  const lastValueRef = useRef(value);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { target: '_blank', rel: 'noopener' } }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'focus:outline-none px-3 py-2 min-h-[120px] text-slate-700 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base [&_a]:text-[#E6007A] [&_a]:underline',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      lastValueRef.current = html;
      onChange(html);
    },
  });

  // Sync when value is set from outside (e.g. reset form)
  useEffect(() => {
    if (!editor) return;
    if (value === lastValueRef.current) return;
    lastValueRef.current = value;
    const current = editor.getHTML();
    const normalized = value || '<p></p>';
    if (current !== normalized) editor.commands.setContent(normalized, false);
  }, [value, editor]);

  const setMinHeight = useCallback(
    (el: HTMLDivElement | null) => {
      if (el && minHeight) el.style.minHeight = minHeight;
    },
    [minHeight]
  );

  return (
    <div
      className={`rich-text-editor-wrapper rounded-lg overflow-hidden ${hasError ? 'ring-1 ring-red-300' : ''} ${className}`}
      ref={setMinHeight}
    >
      <Toolbar editor={editor} hasError={hasError} />
      <div
        className={`border border-slate-200 rounded-b-lg bg-white text-sm ${hasError ? 'border-red-300' : ''}`}
        style={{ minHeight: '120px' }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
