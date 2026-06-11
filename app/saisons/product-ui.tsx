import { Icon, type IconName } from "../components/icons";
import {
  carbonTier,
  MONTHS_SHORT,
  SEASON_LABELS,
  type ProduceCategory,
  type SeasonStatus,
} from "@/lib/seasons-data";

// Presentational seasonal-calendar pieces (server-renderable, no hooks).

const CATEGORY_META: Record<
  ProduceCategory,
  { icon: IconName; label: string; color: string }
> = {
  fruits: { icon: "cherry", label: "Fruit", color: "text-accent" },
  légumes: { icon: "carrot", label: "Légume", color: "text-veg" },
  herbes: { icon: "sprout", label: "Herbe", color: "text-veg" },
};

export function CategoryBadge({
  category,
  className = "",
}: {
  category: ProduceCategory;
  className?: string;
}) {
  const m = CATEGORY_META[category];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-surface/90 px-2.5 py-1 text-[11px] font-bold text-ink backdrop-blur-[2px] ${className}`}
    >
      <Icon name={m.icon} size={13} strokeWidth={2} className={m.color} />
      {m.label}
    </span>
  );
}

const STATE_CLASSES: Record<SeasonStatus, string> = {
  pleine: "bg-veg-soft text-veg",
  début: "bg-accent-soft text-accent-ink",
  fin: "bg-amber-soft text-amber-ink",
  année: "bg-surface-muted text-ink-soft",
  hors: "bg-surface-muted text-ink-faint",
};

export function SeasonStatePill({
  status,
  big = false,
}: {
  status: SeasonStatus;
  big?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full font-bold ${STATE_CLASSES[status]} ${big ? "px-3 py-1 text-[13px]" : "px-2.5 py-1 text-[11.5px]"}`}
    >
      {SEASON_LABELS[status]}
    </span>
  );
}

export function CarbonBadge({
  ecv,
  big = false,
}: {
  ecv: number | null;
  big?: boolean;
}) {
  if (ecv == null) return null;
  const tier = carbonTier(ecv);
  const dot = tier === "low" ? "bg-veg" : tier === "med" ? "bg-amber" : "bg-accent";
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-medium text-ink-soft ${big ? "text-[13px]" : "text-[11.5px]"}`}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
      {ecv.toFixed(2)} kg CO₂e
    </span>
  );
}

/** 12-bubble year availability bar; in-season = accent, current month outlined. */
export function SeasonBar({
  months,
  current,
  showLabels = true,
}: {
  months: number[];
  current: number;
  showLabels?: boolean;
}) {
  return (
    <div className="grid grid-cols-12 gap-1">
      {MONTHS_SHORT.map((label, i) => {
        const m = i + 1;
        const on = months.includes(m);
        const now = m === current;
        return (
          <div
            key={m}
            className={`grid h-[15px] place-items-center rounded-full font-mono text-[7.5px] font-semibold ${
              on ? "bg-accent text-white" : "bg-surface-muted text-ink-faint"
            } ${now ? "outline outline-2 outline-offset-1 outline-accent-ink" : ""}`}
          >
            {showLabels ? label : ""}
          </div>
        );
      })}
    </div>
  );
}
