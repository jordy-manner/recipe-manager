"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Icon, type IconName } from "../components/icons";

// Accessible combobox with an on-the-fly "+ Créer" affordance, used for the
// ingredient / unit / utensil fields of the recipe form. Search is
// accent-insensitive; when the query matches no existing option exactly, a
// highlighted "Créer « … »" row is appended (and is keyboard-selectable).

export type ComboOption = {
  name: string;
  /** Secondary text shown on the right (e.g. a unit abbreviation). */
  meta?: string | null;
  /** Marks an entry still missing required catalog fields ("À compléter"). */
  incomplete?: boolean;
};

type ComboKind = "ing" | "unit" | "uten";

const KIND_ICON: Record<ComboKind, IconName> = {
  ing: "carrot",
  unit: "ruler",
  uten: "tool",
};

const norm = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim();

export function FormCombobox({
  value,
  onPick,
  onCreate,
  onChange,
  options,
  placeholder,
  kind = "ing",
  todo = false,
  ariaLabel,
  className,
}: {
  value: string;
  /** Selecting an existing option (carries the option for e.g. its default unit). */
  onPick: (name: string, option?: ComboOption) => void;
  onCreate: (query: string) => void;
  /** Live free-text edits (kept even if the user never picks an option). */
  onChange?: (text: string) => void;
  options: ComboOption[];
  placeholder?: string;
  kind?: ComboKind;
  todo?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const optId = (i: number) => `${listId}-opt-${i}`;

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const text = open ? q : value;
  const ql = norm(q);
  const filtered = ql ? options.filter((o) => norm(o.name).includes(ql)) : options;
  const exact = options.some((o) => norm(o.name) === ql);
  const showCreate = open && q.trim().length > 0 && !exact;
  const count = filtered.length + (showCreate ? 1 : 0);
  const createIndex = showCreate ? filtered.length : -1;

  const close = () => {
    setOpen(false);
    setQ("");
  };
  const pick = (o: ComboOption) => {
    onPick(o.name, o);
    close();
  };
  const create = () => {
    onCreate(q.trim());
    close();
  };
  const choose = (i: number) => {
    if (i === createIndex) create();
    else if (filtered[i]) pick(filtered[i]);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      setActive((a) => (count ? Math.min(count - 1, a + 1) : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      if (open && count) {
        e.preventDefault();
        choose(Math.min(active, count - 1));
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        close();
      }
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <div
        className={`flex items-center gap-1.5 rounded-input border bg-surface pr-2 transition ${
          open
            ? "border-accent shadow-[0_0_0_3px_var(--color-accent-soft)]"
            : "border-line"
        }`}
      >
        <input
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && count ? optId(Math.min(active, count - 1)) : undefined}
          aria-label={ariaLabel}
          value={text}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={() => {
            setOpen(true);
            setQ("");
            setActive(0);
          }}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(0);
            onChange?.(e.target.value);
          }}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 bg-transparent px-3 py-3 text-[15px] text-ink outline-none placeholder:text-ink-faint"
        />
        {todo && !open && (
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent-ink"
            title="Créé à la volée — unité par défaut / rayon à compléter dans les Paramètres"
          >
            <Icon name="alert" size={11} /> à compléter
          </span>
        )}
        <Icon
          name="chevron"
          size={15}
          className={`shrink-0 text-ink-faint transition ${open ? "rotate-90" : ""}`}
        />
      </div>

      {open && (
        <ul
          role="listbox"
          id={listId}
          className="absolute left-0 right-0 top-[calc(100%+5px)] z-20 max-h-60 min-w-[180px] overflow-auto rounded-input border border-line bg-surface p-1.5 shadow-card-lg"
        >
          {filtered.map((o, i) => (
            <li key={o.name} role="option" id={optId(i)} aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(o);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-[14.5px] text-ink transition ${
                  i === active ? "bg-surface-muted" : ""
                }`}
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[7px] bg-surface-muted text-ink-soft">
                  <Icon name={KIND_ICON[kind]} size={15} />
                </span>
                <span className="min-w-0 flex-1 truncate">{o.name}</span>
                {o.incomplete && <Icon name="alert" size={13} className="shrink-0 text-accent-ink" />}
                {o.meta && <span className="shrink-0 font-mono text-[11px] text-ink-faint">{o.meta}</span>}
              </button>
            </li>
          ))}

          {!filtered.length && !showCreate && (
            <li className="px-3 py-3 text-center text-[13px] text-ink-faint">Aucun résultat.</li>
          )}

          {showCreate && (
            <li role="option" id={optId(createIndex)} aria-selected={active === createIndex}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  create();
                }}
                onMouseEnter={() => setActive(createIndex)}
                className={`mt-1 flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2.5 text-left text-[14px] font-bold text-accent-ink transition ${
                  active === createIndex ? "bg-[color-mix(in_oklab,var(--color-accent-soft)_78%,var(--color-accent))]" : "bg-accent-soft"
                }`}
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[7px] bg-accent text-white">
                  <Icon name="plus" size={15} strokeWidth={2.4} />
                </span>
                Créer «&nbsp;{q.trim()}&nbsp;»
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

/* ---- Mini-modal to create a unit (abbreviation + type) ---- */

export function UnitCreateModal({
  name,
  unitTypes,
  onConfirm,
  onClose,
}: {
  name: string;
  /** Existing unit types to pick from (the "type" referential). */
  unitTypes: { id: string; name: string }[];
  onConfirm: (abbreviation: string, typeId: string | null) => void;
  onClose: () => void;
}) {
  const [abbr, setAbbr] = useState(name);
  const [typeId, setTypeId] = useState<string>(unitTypes[0]?.id ?? "");
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    restoreRef.current = document.activeElement as HTMLElement | null;
    firstRef.current?.focus();
    firstRef.current?.select();
    const el = restoreRef.current;
    return () => el?.focus?.();
  }, []);

  // Focus trap + Escape.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const nodes = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button, input, select, [tabindex]:not([tabindex="-1"])',
    );
    if (!nodes || !nodes.length) return;
    const list = Array.from(nodes);
    const first = list[0];
    const last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const confirm = () => onConfirm(abbr.trim() || name, typeId || null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6 animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        className="relative w-[min(380px,100%)] rounded-card border border-line bg-surface p-5 shadow-card-lg"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-surface-muted text-ink-soft transition hover:text-ink"
        >
          <Icon name="x" size={16} />
        </button>
        <h3 id={titleId} className="flex items-center gap-2 font-display text-xl text-ink">
          <Icon name="ruler" size={18} className="text-accent" /> Nouvelle unité
        </h3>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">
          «&nbsp;{name}&nbsp;» n’existe pas. Renseignez le minimum pour l’utiliser tout de suite — vous
          pourrez compléter plus tard.
        </p>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-[13px] font-bold text-ink">
            Abréviation <em className="font-medium not-italic text-ink-faint">· affichée dans les recettes</em>
          </span>
          <input
            ref={firstRef}
            value={abbr}
            onChange={(e) => setAbbr(e.target.value)}
            className="w-full rounded-input border border-line bg-surface px-3 py-2.5 text-[15px] text-ink outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-soft)]"
          />
        </label>

        <label className="mt-3.5 block">
          <span className="mb-1.5 block text-[13px] font-bold text-ink">Type</span>
          <select
            value={typeId}
            onChange={(e) => setTypeId(e.target.value)}
            className="select-chevron w-full rounded-input border border-line bg-surface px-3 py-2.5 text-[15px] text-ink outline-none focus:border-accent"
          >
            <option value="">— À compléter</option>
            {unitTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-5 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line bg-surface px-4 py-2.5 text-[14px] font-semibold text-ink transition hover:bg-surface-muted"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={confirm}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-[14px] font-bold text-white shadow-card transition hover:bg-accent-deep"
          >
            Ajouter l’unité
          </button>
        </div>
      </div>
    </div>
  );
}
