"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * Lightweight Markdown editor for a single step: a <textarea> whose toolbar
 * (bold, italic, list, link) only appears on focus. Inserts Markdown syntax at
 * the selection. Controlled (value/onChange). The `name` is carried by the
 * textarea for submission (the Server Action reads formData.getAll(name)).
 */
export function StepEditor({
  name,
  value,
  onChange,
  placeholder,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);
  const pendingSel = useRef<[number, number] | null>(null);

  // Restore the selection after an insertion (the textarea is controlled).
  useLayoutEffect(() => {
    if (pendingSel.current && ref.current) {
      const [start, end] = pendingSel.current;
      ref.current.focus();
      ref.current.setSelectionRange(start, end);
      pendingSel.current = null;
    }
  }, [value]);

  function wrap(before: string, after: string) {
    const ta = ref.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const sel = value.slice(s, e);
    onChange(value.slice(0, s) + before + sel + after + value.slice(e));
    pendingSel.current = sel
      ? [s + before.length, e + before.length]
      : [s + before.length, s + before.length];
  }

  function prefixLines(prefix: string) {
    const ta = ref.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const lineStart = value.lastIndexOf("\n", s - 1) + 1;
    const block = value.slice(lineStart, e).replace(/^/gm, prefix);
    onChange(value.slice(0, lineStart) + block + value.slice(e));
    pendingSel.current = [lineStart, lineStart + block.length];
  }

  const btn =
    "rounded px-1.5 py-0.5 text-xs font-semibold text-ink-soft transition hover:bg-surface-2";

  return (
    <div className="flex-1">
      {focused && (
        // onMouseDown preventDefault: keep the textarea focused on click.
        <div className="mb-1 flex gap-1" onMouseDown={(e) => e.preventDefault()}>
          <button type="button" className={btn} onClick={() => wrap("**", "**")} aria-label="Gras">
            <b>B</b>
          </button>
          <button type="button" className={btn} onClick={() => wrap("*", "*")} aria-label="Italique">
            <i>I</i>
          </button>
          <button type="button" className={btn} onClick={() => prefixLines("- ")} aria-label="Liste à puces">
            • Liste
          </button>
          <button type="button" className={btn} onClick={() => wrap("[", "](url)")} aria-label="Lien">
            🔗 Lien
          </button>
        </div>
      )}
      <textarea
        ref={ref}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        rows={2}
        className="w-full resize-y rounded-field border border-line bg-surface px-3.5 py-3 text-[15px] text-ink outline-none transition focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-soft)] placeholder:text-ink-faint"
      />
    </div>
  );
}
