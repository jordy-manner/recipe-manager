"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Icon } from "../components/icons";
import { norm, type CatalogKind } from "@/lib/catalog";
import {
  createIngredient,
  updateIngredient,
  deleteIngredient,
  mergeIngredient,
  createUtensil,
  updateUtensil,
  deleteUtensil,
  mergeUtensil,
  createUnit,
  updateUnit,
  deleteUnit,
  mergeUnit,
  setCatalogImage,
  clearCatalogImage,
  type ActionResult,
} from "./actions";

// A single editable row. Fields beyond name/uses are optional and depend on the
// catalog (ingredient: aisle/defaultUnitId/image ; unit: abbreviation/kind).
export type CatalogRow = {
  id: string;
  name: string;
  uses: number;
  image?: string | null;
  aisleId?: string | null;
  defaultUnitId?: string | null;
  abbreviation?: string | null;
  typeId?: string | null;
  _draft?: boolean; // not yet persisted (added on the fly, name still empty)
};

type FieldKey = "name" | "aisleId" | "defaultUnitId" | "abbreviation" | "typeId";

type ComboOption = { value: string; label: string };

type CreateRefResult =
  | { ok: true; row: { id: string; name: string } }
  | { ok: false; error: string };

export type Column = {
  key: FieldKey;
  label: string;
  /** "text" = free input, "combo" = creatable referential combobox. */
  type?: "text" | "combo";
  options?: ComboOption[];
  /** Creates a new referential value (combo columns); returns the new row. */
  onCreate?: (name: string) => Promise<CreateRefResult>;
  width: string;
  placeholder?: string;
  strong?: boolean;
};

type Props = {
  title: string;
  subtitle: string;
  addLabel: string;
  catalogKind: CatalogKind;
  hasImage?: boolean;
  columns: Column[];
  initialRows: CatalogRow[];
  /** Keys that must be filled for the row to be "complete" (drives the pill). */
  requiredKeys: FieldKey[];
};

/* ---- action dispatchers (kind → the matching Server Action) ---- */

function createFor(kind: CatalogKind, row: CatalogRow) {
  const name = row.name.trim();
  if (kind === "ingredient")
    return createIngredient({ name, aisleId: row.aisleId ?? null, defaultUnitId: row.defaultUnitId ?? null });
  if (kind === "unit")
    return createUnit({ name, abbreviation: row.abbreviation ?? null, typeId: row.typeId ?? null });
  return createUtensil({ name });
}

function updateFor(kind: CatalogKind, id: string, key: FieldKey, row: CatalogRow): Promise<ActionResult> {
  if (kind === "utensil") return updateUtensil(id, row.name.trim());
  if (kind === "ingredient") {
    if (key === "name") return updateIngredient(id, { name: row.name.trim() });
    if (key === "aisleId") return updateIngredient(id, { aisleId: row.aisleId ?? null });
    return updateIngredient(id, { defaultUnitId: row.defaultUnitId ?? null });
  }
  // unit
  if (key === "name") return updateUnit(id, { name: row.name.trim() });
  if (key === "abbreviation") return updateUnit(id, { abbreviation: row.abbreviation ?? null });
  return updateUnit(id, { typeId: row.typeId ?? null });
}

function deleteFor(kind: CatalogKind, id: string) {
  if (kind === "ingredient") return deleteIngredient(id);
  if (kind === "unit") return deleteUnit(id);
  return deleteUtensil(id);
}

function mergeFor(kind: CatalogKind, sourceId: string, targetId: string) {
  if (kind === "ingredient") return mergeIngredient(sourceId, targetId);
  if (kind === "unit") return mergeUnit(sourceId, targetId);
  return mergeUtensil(sourceId, targetId);
}

/* ---- usage badge ---- */

function UsageBadge({ n }: { n: number }) {
  return (
    <span
      className={
        "inline-flex items-baseline gap-1 rounded-full px-2 py-0.5 font-mono text-[12px] " +
        (n === 0 ? "bg-surface-muted text-ink-faint" : "bg-veg-soft text-veg")
      }
      title={n === 0 ? "Non utilisé" : `Utilisé dans ${n} recette${n > 1 ? "s" : ""}`}
    >
      {n} <span className="text-[10px]">rec.</span>
    </span>
  );
}

/* ---- creatable cell combobox (referential value + "+ Créer") ---- */

// Compact combobox for a table cell: accent-insensitive search over an editable
// referential, with a highlighted "Créer « … »" row when the query matches no
// option exactly. Same UX as the recipe form's FormCombobox (lot 4), sized for a
// dense row. Values are referential ids; the visible text is the matching label.
function CellCombo({
  value,
  options,
  onPick,
  onCreate,
  warn,
  placeholder,
  ariaLabel,
}: {
  value: string | null;
  options: ComboOption[];
  onPick: (value: string) => void;
  onCreate?: (name: string) => void;
  warn?: boolean;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [q, setQ] = useState<string | null>(null); // null = display the selected label
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const optId = (i: number) => `${listId}-opt-${i}`;

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQ(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";
  const text = q === null ? selectedLabel : q;
  const ql = norm(q ?? "");
  const filtered = ql ? options.filter((o) => norm(o.label).includes(ql)) : options;
  const exact = options.some((o) => norm(o.label) === norm((q ?? "").trim()));
  const showCreate = !!onCreate && !!(q && q.trim()) && !exact;
  const count = filtered.length + (showCreate ? 1 : 0);
  const createIndex = showCreate ? filtered.length : -1;

  const close = () => {
    setOpen(false);
    setQ(null);
  };
  const pick = (o: ComboOption) => {
    onPick(o.value);
    close();
  };
  const create = () => {
    onCreate?.((q ?? "").trim());
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
    <div ref={rootRef} className="relative">
      <div
        className={
          "flex items-center gap-1 rounded-input border bg-surface pr-1.5 transition focus-within:border-accent " +
          (warn ? "border-amber" : "border-line")
        }
      >
        <input
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && count ? optId(Math.min(active, count - 1)) : undefined}
          aria-label={ariaLabel}
          aria-invalid={warn || undefined}
          value={text}
          placeholder={placeholder ?? "—"}
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
          }}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 bg-transparent px-2.5 py-1.5 text-sm text-ink outline-none placeholder:text-ink-faint"
        />
        <Icon
          name="chevron"
          size={13}
          className={"shrink-0 text-ink-faint transition " + (open ? "rotate-90" : "")}
        />
      </div>

      {open && (
        <ul
          role="listbox"
          id={listId}
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-56 min-w-[160px] overflow-auto rounded-input border border-line bg-surface p-1.5 shadow-card-lg"
        >
          {filtered.map((o, i) => (
            <li key={o.value} role="option" id={optId(i)} aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(o);
                }}
                onMouseEnter={() => setActive(i)}
                className={
                  "flex w-full items-center justify-between gap-2 rounded-[8px] px-2.5 py-1.5 text-left text-sm text-ink transition " +
                  (i === active ? "bg-surface-muted" : "")
                }
              >
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {o.value === value && <Icon name="check" size={13} strokeWidth={2.4} className="shrink-0 text-accent-ink" />}
              </button>
            </li>
          ))}

          {!filtered.length && !showCreate && (
            <li className="px-2.5 py-2 text-center text-[13px] text-ink-faint">Aucun résultat.</li>
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
                className={
                  "mt-1 flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-[13.5px] font-bold text-accent-ink transition " +
                  (active === createIndex
                    ? "bg-[color-mix(in_oklab,var(--color-accent-soft)_78%,var(--color-accent))]"
                    : "bg-accent-soft")
                }
              >
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-[6px] bg-accent text-white">
                  <Icon name="plus" size={13} strokeWidth={2.4} />
                </span>
                Créer «&nbsp;{(q ?? "").trim()}&nbsp;»
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

/* ---- image cell (auto Pexels thumbnail or custom upload) ---- */

function hueFor(s: string): number {
  let h = 0;
  const str = s || "x";
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % 360;
}

function ImageCell({
  kind,
  row,
  onImage,
}: {
  kind: "ingredient" | "utensil";
  row: CatalogRow;
  onImage: (id: string, url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pexels, setPexels] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const disabled = !!row._draft; // a custom upload needs a persisted id

  // Lazy-load the auto Pexels thumbnail when there's no custom image.
  useEffect(() => {
    if (row.image || row._draft || !row.name.trim()) return;
    let alive = true;
    fetch(`/api/pexels?q=${encodeURIComponent(row.name)}`)
      .then((r) => r.json())
      .then((d: { url: string | null }) => alive && setPexels(d.url))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [row.image, row.name, row._draft]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const fd = new FormData();
    fd.append("file", f);
    startTransition(async () => {
      const res = await setCatalogImage(kind, row.id, fd);
      if (res.ok) onImage(row.id, res.url);
    });
  };

  const shown = row.image ?? pexels;
  const hue = hueFor(row.name);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled || pending}
        onClick={() => inputRef.current?.click()}
        className="group relative block h-11 w-11 overflow-hidden rounded-input border border-line disabled:cursor-not-allowed"
        title={
          disabled
            ? "Enregistrez l'entrée pour importer une image"
            : row.image
              ? "Image personnalisée — cliquer pour remplacer"
              : "Pexels (auto) — cliquer pour importer une image"
        }
      >
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt="" className="h-full w-full object-cover" />
        ) : (
          <span
            className="block h-full w-full"
            style={{
              background: `linear-gradient(150deg, oklch(0.74 0.13 ${hue}), oklch(0.6 0.15 ${hue - 12}))`,
            }}
          />
        )}
        <span className="absolute inset-0 hidden place-items-center bg-ink/35 text-surface group-hover:grid">
          <Icon name="camera" size={15} />
        </span>
        <span
          className={
            "absolute bottom-0 inset-x-0 text-center text-[8px] font-semibold uppercase tracking-wide " +
            (row.image ? "bg-accent text-surface" : "bg-ink/55 text-surface")
          }
        >
          {row.image ? "Perso" : "Pexels"}
        </span>
      </button>
      {row.image && !disabled && (
        <button
          type="button"
          onClick={() =>
            startTransition(async () => {
              const res = await clearCatalogImage(kind, row.id);
              if (res.ok) onImage(row.id, null);
            })
          }
          className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border border-line bg-surface text-ink-soft shadow-card hover:text-ink"
          title="Revenir à l'image Pexels automatique"
        >
          <Icon name="refresh" size={11} />
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={onFile} />
    </div>
  );
}

/* ---- main table ---- */

export function CatalogTable({
  title,
  subtitle,
  addLabel,
  catalogKind,
  hasImage,
  columns,
  initialRows,
  requiredKeys,
}: Props) {
  const [rows, setRows] = useState<CatalogRow[]>(initialRows);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "todo">("all");
  const [toast, setToast] = useState<{ msg: string; tone: "ok" | "err" } | null>(null);
  const [mergeForId, setMergeForId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const draftSeq = useRef(0);
  const prevVal = useRef<string | null>(null);

  // Combobox options live in state (seeded from the columns) so a value created
  // on the fly via "+ Créer" shows up immediately in every row's dropdown.
  const [optionsByKey, setOptionsByKey] = useState<Record<string, ComboOption[]>>(() =>
    Object.fromEntries(
      columns.filter((c) => c.type === "combo").map((c) => [c.key, c.options ?? []]),
    ),
  );

  const incomplete = (r: CatalogRow) => requiredKeys.some((k) => !r[k]);
  const todoCount = rows.filter(incomplete).length;

  let filtered = rows;
  if (q.trim()) filtered = filtered.filter((r) => norm(r.name).includes(norm(q)));
  if (status === "todo") filtered = filtered.filter(incomplete);

  const flash = (msg: string, tone: "ok" | "err" = "ok") => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 3600);
  };
  const setField = (id: string, key: FieldKey | "image", value: string | null) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [key]: value } : r)));

  // `row` is the up-to-date row (handlers rebind every render), so no ref needed.
  const persistRow = (row: CatalogRow, key: FieldKey, old: string | null) => {
    if (row._draft) {
      if (!row.name.trim()) return; // nothing to persist until it has a name
      startTransition(async () => {
        const res = await createFor(catalogKind, row);
        if (res.ok)
          setRows((rs) => rs.map((r) => (r.id === row.id ? { ...res.row, _draft: false } : r)));
        else flash(res.error, "err");
      });
      return;
    }
    if ((row[key] ?? "") === (old ?? "")) return;
    startTransition(async () => {
      const res = await updateFor(catalogKind, row.id, key, row);
      if (!res.ok) {
        setField(row.id, key, old); // revert the optimistic edit
        flash(res.error, "err");
      }
    });
  };

  // Pick an existing referential value on a combo cell (persist like a select).
  const pickCombo = (row: CatalogRow, key: FieldKey, value: string | null) => {
    const old = (row[key] as string | null) ?? null;
    setField(row.id, key, value);
    persistRow({ ...row, [key]: value }, key, old);
  };

  // Create a referential value from a combo cell, append it to the shared
  // options, then select it on the row.
  const createCombo = (row: CatalogRow, col: Column, name: string) => {
    if (!col.onCreate) return;
    startTransition(async () => {
      const res = await col.onCreate!(name);
      if (!res.ok) {
        flash(res.error, "err");
        return;
      }
      const opt = { value: res.row.id, label: res.row.name };
      setOptionsByKey((m) => {
        const list = m[col.key] ?? [];
        return list.some((o) => o.value === opt.value)
          ? m
          : { ...m, [col.key]: [...list, opt].sort((a, b) => a.label.localeCompare(b.label, "fr")) };
      });
      pickCombo(row, col.key, opt.value);
    });
  };

  const add = () => {
    const id = `draft-${++draftSeq.current}`;
    setRows((rs) => [
      { id, name: "", uses: 0, image: null, aisleId: null, defaultUnitId: null, abbreviation: null, typeId: null, _draft: true },
      ...rs,
    ]);
    setStatus("all");
    setQ("");
    setTimeout(() => document.getElementById(`cell-${id}`)?.focus(), 30);
  };

  const remove = (row: CatalogRow) => {
    if (row._draft) {
      setRows((rs) => rs.filter((r) => r.id !== row.id));
      return;
    }
    if (row.uses > 0) {
      flash(
        `« ${row.name || "Sans nom"} » est utilisé dans ${row.uses} recette${row.uses > 1 ? "s" : ""} — fusionnez-le plutôt que de le supprimer.`,
        "err",
      );
      return;
    }
    startTransition(async () => {
      const res = await deleteFor(catalogKind, row.id);
      if (res.ok) setRows((rs) => rs.filter((r) => r.id !== row.id));
      else flash(res.error, "err");
    });
  };

  const doMerge = (source: CatalogRow, targetId: string) => {
    startTransition(async () => {
      const res = await mergeFor(catalogKind, source.id, targetId);
      if (res.ok) {
        const target = rows.find((r) => r.id === targetId);
        setRows((rs) =>
          rs
            .filter((r) => r.id !== source.id)
            .map((r) => (r.id === targetId ? { ...r, uses: r.uses + res.moved } : r)),
        );
        setMergeForId(null);
        flash(
          `« ${source.name || "Sans nom"} » fusionné dans « ${target?.name ?? ""} » — ${res.moved} recette(s) rebranchée(s).`,
        );
      } else flash(res.error, "err");
    });
  };

  const grid =
    (hasImage ? "52px " : "") + columns.map((c) => c.width).join(" ") + " 90px 76px";

  const mergeSource = mergeForId ? rows.find((r) => r.id === mergeForId) : null;
  const mergeTargets = mergeSource
    ? rows.filter((r) => r.id !== mergeSource.id && !r._draft)
    : [];

  return (
    <section className="animate-fade-up">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink">{title}</h1>
          <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink-soft focus-within:border-accent">
            <Icon name="search" size={16} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher…"
              aria-label="Rechercher dans le catalogue"
              className="w-32 bg-transparent text-ink outline-none placeholder:text-ink-faint sm:w-44"
            />
            {q && (
              <button type="button" onClick={() => setQ("")} aria-label="Effacer la recherche">
                <Icon name="x" size={14} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={add}
            className="inline-flex items-center gap-1.5 rounded-input bg-accent px-3.5 py-2 text-sm font-semibold text-surface transition hover:bg-accent-deep"
          >
            <Icon name="plus" size={17} strokeWidth={2.2} />
            <span className="hidden sm:inline">{addLabel}</span>
          </button>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => setStatus("all")}
          className={
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 transition " +
            (status === "all"
              ? "border-accent bg-accent-soft text-accent-ink"
              : "border-line text-ink-soft hover:bg-surface-muted")
          }
        >
          Toutes <span className="font-mono text-xs">{rows.length}</span>
        </button>
        {todoCount > 0 && (
          <button
            type="button"
            onClick={() => setStatus("todo")}
            className={
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 transition " +
              (status === "todo"
                ? "border-amber bg-amber-soft text-amber-ink"
                : "border-line text-ink-soft hover:bg-surface-muted")
            }
          >
            <Icon name="alert" size={13} /> À compléter <span className="font-mono text-xs">{todoCount}</span>
          </button>
        )}
        {q && (
          <span className="text-ink-faint">
            · « {q} » : {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="mt-3 overflow-x-auto rounded-card border border-line bg-surface shadow-card">
        <div className="min-w-[640px]">
          {/* header */}
          <div
            className="grid items-center gap-3 border-b border-line-soft px-4 py-2.5 font-mono text-[11px] uppercase tracking-wide text-ink-faint"
            style={{ gridTemplateColumns: grid }}
          >
            {hasImage && <div>Photo</div>}
            {columns.map((c) => (
              <div key={c.key}>{c.label}</div>
            ))}
            <div>Usage</div>
            <div className="text-right" />
          </div>

          {filtered.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-ink-faint">
              Aucune entrée
              {q ? " pour cette recherche" : status === "todo" ? " à compléter 🎉" : ""}.
            </div>
          )}

          {filtered.map((r) => {
            const todo = incomplete(r);
            return (
              <div
                key={r.id}
                id={`row-${r.id}`}
                className={
                  "grid scroll-mt-[128px] items-center gap-3 border-b border-line-soft px-4 py-2 transition last:border-b-0 target:bg-accent-soft/60 target:ring-2 target:ring-inset target:ring-accent " +
                  (r._draft ? "bg-accent-soft/30 " : "") +
                  (todo ? "bg-amber-soft/30" : "")
                }
                style={{ gridTemplateColumns: grid }}
              >
                {hasImage && (
                  <ImageCell
                    kind={catalogKind as "ingredient" | "utensil"}
                    row={r}
                    onImage={(id, url) => setField(id, "image", url)}
                  />
                )}
                {columns.map((c, ci) => {
                  const value = (r[c.key] as string | null) ?? "";
                  const warn = todo && requiredKeys.includes(c.key) && !value;
                  if (c.type === "combo") {
                    return (
                      <div key={c.key}>
                        <CellCombo
                          value={value || null}
                          options={optionsByKey[c.key] ?? []}
                          warn={warn}
                          placeholder={c.placeholder}
                          ariaLabel={`${c.label} — ${r.name || "nouvelle entrée"}`}
                          onPick={(v) => pickCombo(r, c.key, v)}
                          onCreate={c.onCreate ? (name) => createCombo(r, c, name) : undefined}
                        />
                      </div>
                    );
                  }
                  return (
                    <div key={c.key} className="flex items-center gap-2">
                      <input
                        id={ci === 0 ? `cell-${r.id}` : undefined}
                        aria-label={`${c.label} — ${r.name || "nouvelle entrée"}`}
                        aria-invalid={warn || undefined}
                        value={value}
                        placeholder={c.placeholder}
                        onFocus={() => (prevVal.current = (r[c.key] as string | null) ?? null)}
                        onChange={(e) => setField(r.id, c.key, e.target.value)}
                        onBlur={() => persistRow(r, c.key, prevVal.current)}
                        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                        className={
                          "w-full rounded-input border bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-accent " +
                          (c.strong ? "font-semibold text-ink " : "text-ink-soft ") +
                          (warn ? "border-amber" : "border-line")
                        }
                      />
                      {ci === 0 && todo && (
                        <span
                          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-soft px-1.5 py-0.5 text-[10px] font-semibold text-amber-ink"
                          title="Entrée à compléter : quelques champs requis restent à renseigner"
                        >
                          <Icon name="alert" size={10} /> À compléter
                        </span>
                      )}
                    </div>
                  );
                })}
                <div>
                  <UsageBadge n={r.uses} />
                </div>
                <div className="flex items-center justify-end gap-1">
                  {!r._draft && rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setMergeForId(r.id)}
                      className="grid h-7 w-7 place-items-center rounded-input text-ink-faint transition hover:bg-surface-muted hover:text-ink"
                      title="Fusionner avec une autre entrée"
                      aria-label={`Fusionner « ${r.name || "Sans nom"} »`}
                    >
                      <Icon name="merge" size={15} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(r)}
                    className={
                      "grid h-7 w-7 place-items-center rounded-input transition " +
                      (r.uses > 0 && !r._draft
                        ? "text-ink-faint hover:bg-surface-muted"
                        : "text-ink-faint hover:bg-accent-soft hover:text-accent-ink")
                    }
                    title={
                      r.uses > 0 && !r._draft
                        ? `Utilisé dans ${r.uses} recette(s) — fusionner pour dédoublonner`
                        : "Supprimer"
                    }
                    aria-label={`Supprimer « ${r.name || "Sans nom"} »`}
                  >
                    <Icon name={r.uses > 0 && !r._draft ? "lock" : "trash"} size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {mergeSource && (
        <MergeModal
          source={mergeSource}
          targets={mergeTargets}
          onClose={() => setMergeForId(null)}
          onPick={(targetId) => doMerge(mergeSource, targetId)}
        />
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={
            "fixed bottom-5 left-1/2 z-50 flex max-w-[min(92vw,460px)] -translate-x-1/2 items-center gap-2 rounded-input px-4 py-2.5 text-sm shadow-card-lg " +
            (toast.tone === "err"
              ? "bg-accent-deep text-surface"
              : "bg-ink text-surface")
          }
        >
          <Icon name={toast.tone === "err" ? "alert" : "check"} size={16} strokeWidth={2.2} />
          {toast.msg}
        </div>
      )}
    </section>
  );
}

/* ---- merge modal ---- */

function MergeModal({
  source,
  targets,
  onClose,
  onPick,
}: {
  source: CatalogRow;
  targets: CatalogRow[];
  onClose: () => void;
  onPick: (targetId: string) => void;
}) {
  const titleId = useId();
  const [search, setSearch] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const list = search.trim()
    ? targets.filter((t) => norm(t.name).includes(norm(search)))
    : targets;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-card border border-line bg-surface p-5 shadow-card-lg"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-input text-ink-faint hover:bg-surface-muted hover:text-ink"
        >
          <Icon name="x" size={16} />
        </button>
        <h2 id={titleId} className="flex items-center gap-2 font-display text-lg text-ink">
          <Icon name="merge" size={18} className="text-accent" /> Fusionner un doublon
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Fusionner <b>« {source.name || "Sans nom"} »</b>
          {source.uses > 0 ? ` (${source.uses} recette${source.uses > 1 ? "s" : ""})` : ""} dans :
        </p>

        {targets.length > 6 && (
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une cible…"
            aria-label="Rechercher une entrée cible"
            className="mt-3 w-full rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
        )}

        <div className="mt-3 max-h-72 overflow-y-auto rounded-input border border-line-soft">
          {list.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-ink-faint">Aucune cible.</div>
          )}
          {list.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onPick(t.id)}
              className="flex w-full items-center justify-between gap-3 border-b border-line-soft px-3 py-2.5 text-left text-sm last:border-b-0 hover:bg-surface-muted"
            >
              <span className="truncate text-ink">{t.name || "Sans nom"}</span>
              <UsageBadge n={t.uses} />
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-faint">
          « {source.name || "Sans nom"} » sera supprimé et ses {source.uses} recette(s) rebranchées
          sur l’entrée choisie.
        </p>
      </div>
    </div>
  );
}
