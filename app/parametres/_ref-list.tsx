"use client";

import { useRef, useState, useTransition } from "react";
import { Icon, type IconName } from "../components/icons";
import { norm, type RefRow } from "@/lib/catalog";
import type { RefResult } from "./ref-actions";

// Simple editor for one referential (aisles / unit types / tags / categories):
// search, add (a focused row at the top), inline rename, a usage counter, and a
// delete blocked when the entry is still in use (lock + toast, like the catalog
// "merge, don't delete"). Renaming cascades for free server-side: the relation
// follows the id, so every entity referencing the value is renamed at once.

type Row = RefRow & { _draft?: boolean };

export function RefList({
  title,
  subtitle,
  icon,
  addLabel,
  placeholder,
  usageNoun,
  note,
  initialRows,
  create,
  rename,
  remove,
}: {
  title: string;
  subtitle: string;
  icon: IconName;
  addLabel: string;
  placeholder: string;
  /** Singular noun for the usage tooltip ("ingrédient", "recette", "unité"). */
  usageNoun: string;
  note?: string;
  initialRows: RefRow[];
  create: (name: string) => Promise<RefResult<{ row: RefRow }>>;
  rename: (id: string, name: string) => Promise<RefResult>;
  remove: (id: string) => Promise<RefResult>;
}) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<{ msg: string; tone: "ok" | "err" } | null>(null);
  const [, startTransition] = useTransition();
  const draftSeq = useRef(0);
  const prevVal = useRef<string>("");

  const flash = (msg: string, tone: "ok" | "err" = "ok") => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 3400);
  };
  const setName = (id: string, name: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, name } : r)));

  const filtered = q.trim() ? rows.filter((r) => norm(r.name).includes(norm(q))) : rows;

  const persist = (row: Row, old: string) => {
    const name = row.name.trim();
    if (row._draft) {
      if (!name) {
        setRows((rs) => rs.filter((r) => r.id !== row.id)); // empty draft → drop
        return;
      }
      startTransition(async () => {
        const res = await create(name);
        if (res.ok) setRows((rs) => rs.map((r) => (r.id === row.id ? res.row : r)));
        else {
          flash(res.error, "err");
          setRows((rs) => rs.filter((r) => r.id !== row.id));
        }
      });
      return;
    }
    if (name === old) return;
    if (!name) {
      setName(row.id, old); // a rename can't blank a name
      return;
    }
    startTransition(async () => {
      const res = await rename(row.id, name);
      if (!res.ok) {
        setName(row.id, old);
        flash(res.error, "err");
      }
    });
  };

  const add = () => {
    const id = `draft-${++draftSeq.current}`;
    setRows((rs) => [{ id, name: "", uses: 0, _draft: true }, ...rs]);
    setQ("");
    setTimeout(() => document.getElementById(`ref-${id}`)?.focus(), 30);
  };

  const del = (row: Row) => {
    if (row._draft) {
      setRows((rs) => rs.filter((r) => r.id !== row.id));
      return;
    }
    if (row.uses > 0) {
      flash(
        `« ${row.name || "Sans nom"} » est utilisé ${row.uses} fois — réaffectez d'abord les entrées concernées.`,
        "err",
      );
      return;
    }
    startTransition(async () => {
      const res = await remove(row.id);
      if (res.ok) setRows((rs) => rs.filter((r) => r.id !== row.id));
      else flash(res.error, "err");
    });
  };

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
              aria-label={`Rechercher dans ${title}`}
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
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent bg-accent-soft px-3 py-1 text-accent-ink">
          {title} <span className="font-mono text-xs">{rows.length}</span>
        </span>
        {q && (
          <span className="text-ink-faint">
            · « {q} » : {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="mt-3 overflow-hidden rounded-card border border-line bg-surface shadow-card">
        <div
          className="grid items-center gap-3 border-b border-line-soft px-4 py-2.5 font-mono text-[11px] uppercase tracking-wide text-ink-faint"
          style={{ gridTemplateColumns: "1fr 96px 56px" }}
        >
          <div>Nom</div>
          <div>Usage</div>
          <div className="text-right" />
        </div>

        {filtered.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-ink-faint">
            Aucune entrée{q ? " pour cette recherche" : ""}.
          </div>
        )}

        {filtered.map((r) => (
          <div
            key={r.id}
            className={
              "grid items-center gap-3 border-b border-line-soft px-4 py-2 transition last:border-b-0 " +
              (r._draft ? "bg-accent-soft/30" : "")
            }
            style={{ gridTemplateColumns: "1fr 96px 56px" }}
          >
            <div className="flex items-center gap-2.5">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-input bg-surface-muted text-ink-soft">
                <Icon name={icon} size={15} />
              </span>
              <input
                id={`ref-${r.id}`}
                aria-label={`Nom — ${r.name || "nouvelle entrée"}`}
                value={r.name}
                placeholder={placeholder}
                onFocus={() => (prevVal.current = r.name)}
                onChange={(e) => setName(r.id, e.target.value)}
                onBlur={() => persist(r, prevVal.current)}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                className="w-full rounded-input border border-line bg-surface px-2.5 py-1.5 text-sm font-semibold text-ink outline-none focus:border-accent"
              />
            </div>
            <div>
              <span
                className={
                  "inline-flex items-baseline gap-1 rounded-full px-2 py-0.5 font-mono text-[12px] " +
                  (r.uses === 0 ? "bg-surface-muted text-ink-faint" : "bg-veg-soft text-veg")
                }
                title={r.uses === 0 ? "Non utilisé" : `Utilisé par ${r.uses} ${usageNoun}${r.uses > 1 ? "s" : ""}`}
              >
                {r.uses} <span className="text-[10px]">us.</span>
              </span>
            </div>
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => del(r)}
                className={
                  "grid h-7 w-7 place-items-center rounded-input transition " +
                  (r.uses > 0 && !r._draft
                    ? "text-ink-faint hover:bg-surface-muted"
                    : "text-ink-faint hover:bg-accent-soft hover:text-accent-ink")
                }
                title={r.uses > 0 && !r._draft ? `Utilisé ${r.uses} fois — suppression bloquée` : "Supprimer"}
                aria-label={`Supprimer « ${r.name || "Sans nom"} »`}
              >
                <Icon name={r.uses > 0 && !r._draft ? "lock" : "trash"} size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {note && <p className="mt-3 text-xs text-ink-faint">{note}</p>}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={
            "fixed bottom-5 left-1/2 z-50 flex max-w-[min(92vw,460px)] -translate-x-1/2 items-center gap-2 rounded-input px-4 py-2.5 text-sm shadow-card-lg " +
            (toast.tone === "err" ? "bg-accent-deep text-surface" : "bg-ink text-surface")
          }
        >
          <Icon name={toast.tone === "err" ? "lock" : "check"} size={16} strokeWidth={2.2} />
          {toast.msg}
        </div>
      )}
    </section>
  );
}
