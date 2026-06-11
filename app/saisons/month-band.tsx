"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { MONTHS } from "@/lib/seasons-data";

/** 12-month band; current month dotted, selected month in accent → pushes ?m=. */
export function MonthBand({ current, selected }: { current: number; selected: number }) {
  const router = useRouter();
  const sp = useSearchParams();

  function go(m: number) {
    const params = new URLSearchParams(sp.toString());
    params.set("m", String(m));
    router.push(`/saisons?${params.toString()}`);
  }

  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))" }}
    >
      {MONTHS.map((name, i) => {
        const m = i + 1;
        const on = selected === m;
        const now = current === m;
        return (
          <button
            key={m}
            type="button"
            onClick={() => go(m)}
            aria-pressed={on}
            aria-current={now ? "date" : undefined}
            className={`relative rounded-[12px] border px-2.5 py-2.5 text-[14px] font-bold transition ${
              on
                ? "border-accent bg-accent text-white"
                : now
                  ? "border-accent text-accent-ink"
                  : "border-line bg-surface text-ink-soft hover:border-ink-faint hover:text-ink"
            }`}
          >
            {name}
            {now && (
              <span
                className={`absolute right-2 top-2 h-[5px] w-[5px] rounded-full ${on ? "bg-white" : "bg-accent"}`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
