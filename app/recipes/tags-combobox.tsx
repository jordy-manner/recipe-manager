"use client";

import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { useState } from "react";

/**
 * Multi-value tags field: chips + autocomplete (Headless UI Combobox) with
 * free creation. Each selected tag is posted via a hidden <input> sharing the
 * same `name`, so it's readable on the Server Action side via formData.getAll(name).
 */
export function TagsCombobox({
  name,
  options,
  defaultValue,
  onSelectionChange,
}: {
  name: string;
  options: string[];
  defaultValue: string[];
  onSelectionChange?: (tags: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>(defaultValue);
  const [query, setQuery] = useState("");

  const q = query.trim();
  const ql = q.toLowerCase();

  const filtered = options.filter(
    (o) => o.toLowerCase().includes(ql) && !selected.includes(o),
  );
  const canCreate =
    q.length > 0 &&
    !options.some((o) => o.toLowerCase() === ql) &&
    !selected.some((s) => s.toLowerCase() === ql);

  function commit(next: string[]) {
    setSelected(next);
    onSelectionChange?.(next);
  }

  function handleChange(values: string[]) {
    commit(Array.from(new Set(values.map((v) => v.trim()).filter(Boolean))));
    setQuery("");
  }

  function remove(tag: string) {
    commit(selected.filter((t) => t !== tag));
  }

  return (
    <div>
      {/* Values posted to the Server Action: one input per tag (getAll(name)). */}
      {selected.map((tag) => (
        <input key={tag} type="hidden" name={name} value={tag} />
      ))}

      <Combobox multiple value={selected} onChange={handleChange} immediate>
        <div className="flex flex-wrap items-center gap-2 rounded-field border border-line bg-surface px-2.5 py-2 focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--color-accent-soft)]">
          {selected.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-[13px] font-semibold text-accent-ink"
            >
              {tag}
              <button
                type="button"
                onClick={() => remove(tag)}
                aria-label={`Retirer ${tag}`}
                className="text-accent-ink/60 transition hover:text-accent-ink"
              >
                ✕
              </button>
            </span>
          ))}
          <ComboboxInput
            className="min-w-32 flex-1 bg-transparent px-1 py-1 text-[15px] text-ink outline-none placeholder:text-ink-faint"
            placeholder={selected.length === 0 ? "Ajouter un tag…" : ""}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </div>

        <ComboboxOptions
          anchor="bottom start"
          className="z-10 mt-1 w-[var(--input-width)] rounded-field border border-line bg-surface py-1 shadow-pop empty:invisible"
        >
          {filtered.map((o) => (
            <ComboboxOption
              key={o}
              value={o}
              className="cursor-pointer px-3 py-1.5 text-[14px] text-ink-soft data-[focus]:bg-surface-2"
            >
              {o}
            </ComboboxOption>
          ))}
          {canCreate && (
            <ComboboxOption
              value={q}
              className="cursor-pointer px-3 py-1.5 text-[14px] text-ink-soft data-[focus]:bg-surface-2"
            >
              Créer « <span className="font-semibold">{q}</span> »
            </ComboboxOption>
          )}
        </ComboboxOptions>
      </Combobox>
    </div>
  );
}
