"use client";

import { Icon } from "../components/icons";
import { Dropdown, type DropdownOption } from "./dropdown";
import { ALL_MONTHS, MONTHS, MONTHS_ABBR } from "@/lib/seasons-data";

const SEASONS: [string, number[]][] = [
  ["Printemps", [3, 4, 5]],
  ["Été", [6, 7, 8]],
  ["Automne", [9, 10, 11]],
  ["Hiver", [12, 1, 2]],
];

/** Multi-month selector: checkable pills + shortcuts (desktop) / dropdown (mobile). */
export function MonthSelect({
  months,
  setMonths,
  currentMonth,
}: {
  months: number[];
  setMonths: (m: number[]) => void;
  currentMonth: number;
}) {
  const sel = new Set(months);
  const set = (arr: number[]) => setMonths([...arr].sort((a, b) => a - b));
  const toggle = (m: number) =>
    set(sel.has(m) ? months.filter((x) => x !== m) : [...months, m]);
  const eq = (arr: number[]) => arr.length === months.length && arr.every((m) => sel.has(m));

  const shortcuts: { key: string; label: string; arr: number[]; icon?: "sun" }[] = [
    { key: "mois", label: "Ce mois-ci", arr: [currentMonth], icon: "sun" },
    { key: "annee", label: "Toute l'année", arr: [...ALL_MONTHS] },
    ...SEASONS.map(([label, arr]) => ({ key: label, label, arr })),
  ];

  const quickVal =
    eq([currentMonth]) ? "mois"
    : eq([...ALL_MONTHS]) ? "annee"
    : (SEASONS.find(([, arr]) => eq(arr)) ?? [""])[0];

  const dropdownOptions: DropdownOption[] = [
    ...shortcuts.map((s) => ({ value: s.key, label: s.label, icon: s.icon })),
    { value: "clear", label: "Tout effacer", icon: "x", variant: "clear" as const },
  ];

  function applyShortcut(value: string) {
    if (value === "clear") return setMonths([]);
    const s = shortcuts.find((x) => x.key === value);
    if (s) set(s.arr);
  }

  return (
    <div className="flex flex-col gap-3.5">
      {/* Shortcuts — buttons on desktop, custom dropdown on mobile */}
      <div className="flex items-center gap-2">
        <div className="hidden flex-wrap gap-2 sm:flex">
          {shortcuts.map((s) => {
            const on = eq(s.arr);
            return (
              <button
                key={s.key}
                type="button"
                aria-pressed={on}
                onClick={() => set(s.arr)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13.5px] font-semibold transition ${
                  on
                    ? "border-accent-ink bg-accent-soft text-accent-ink"
                    : "border-line bg-surface text-ink-soft hover:border-ink-faint hover:text-ink"
                }`}
              >
                {s.icon && <Icon name={s.icon} size={14} />}
                {s.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setMonths([])}
            disabled={months.length === 0}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[13.5px] font-semibold text-ink-soft transition hover:border-ink-faint hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="x" size={13} /> Tout effacer
          </button>
        </div>
        <div className="w-full sm:hidden">
          <Dropdown
            ariaLabel="Raccourcis de sélection des mois"
            value={quickVal || ""}
            onChange={applyShortcut}
            options={dropdownOptions}
            emptyLabel={months.length === 0 ? "Aucun mois" : `${months.length} mois`}
          />
        </div>
      </div>

      {/* Month pills — 4 columns on mobile, inline on desktop */}
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {MONTHS_ABBR.map((abbr, i) => {
          const m = i + 1;
          const on = sel.has(m);
          const now = m === currentMonth;
          return (
            <button
              key={m}
              type="button"
              aria-pressed={on}
              aria-current={now ? "date" : undefined}
              title={MONTHS[i]}
              onClick={() => toggle(m)}
              className={`relative rounded-input border py-2 text-[13.5px] font-bold transition ${
                on
                  ? "border-accent bg-accent text-white"
                  : now
                    ? "border-accent text-accent-ink"
                    : "border-line bg-surface text-ink-soft hover:border-ink-faint hover:text-ink"
              }`}
            >
              {abbr}
              {now && (
                <span
                  className={`absolute right-1.5 top-1.5 h-[5px] w-[5px] rounded-full ${on ? "bg-white" : "bg-accent"}`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
