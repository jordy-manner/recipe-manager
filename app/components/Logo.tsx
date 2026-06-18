import type { CSSProperties } from "react";

const EGG_BG =
  "radial-gradient(circle at 39% 40%, #fff 0 6%, transparent 6.5%)," +
  "radial-gradient(circle at 46% 46%, var(--color-accent) 0 25%, transparent 26%)," +
  "radial-gradient(circle at 50% 50%, #fff 0 80%, var(--color-accent) 80% 100%)";

/** Standalone egg disc — used in the loader bubble and AppIcon. */
export function Egg({ className = "", size }: { className?: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className={"inline-block rounded-full align-middle " + className}
      style={{ background: EGG_BG, ...(size ? { width: size, height: size } : {}) }}
    />
  );
}

/** "o" replaced by a flat egg: white disc, terracotta yolk offset top-left, white glint. */
function EggO({ size }: { size: number }) {
  const d = Math.round(size * 0.66);
  return (
    <span
      aria-label="o"
      role="img"
      style={
        {
          display: "inline-block",
          width: d,
          height: d,
          borderRadius: "50%",
          verticalAlign: "middle",
          margin: "0 0.01em",
          background: [
            "radial-gradient(circle at 39% 40%, #fff 0 6%, transparent 6.5%)",
            "radial-gradient(circle at 46% 46%, var(--color-accent) 0 25%, transparent 26%)",
            "radial-gradient(circle at 50% 50%, #fff 0 80%, var(--color-accent) 80% 100%)",
          ].join(", "),
        } as CSSProperties
      }
    />
  );
}

/**
 * Equalizer bars forming an "M" — 7 bars with symmetric heights tracing an M contour.
 * Used standalone (loader bubble) or inside AppIcon.
 */
export function MBars({ color = "white", h = 18 }: { color?: string; h?: number }) {
  const HEIGHTS = [1, 0.6, 0.38, 0.24, 0.38, 0.6, 1];
  const bw = Math.max(1, Math.round(h * 0.078));
  const gap = Math.max(1, Math.round(h * 0.044));
  const radius = Math.max(1, Math.round(h * 0.022));
  return (
    <span
      aria-hidden="true"
      style={{ display: "inline-flex", alignItems: "flex-end", gap, height: h }}
    >
      {HEIGHTS.map((f, i) => (
        <span
          key={i}
          style={{
            display: "block",
            width: bw,
            height: Math.round(f * h),
            background: color,
            borderRadius: radius,
          }}
        />
      ))}
    </span>
  );
}

/**
 * Mealoday wordmark: "Meal(o)day" in Outfit 600, the "o" is a styled egg.
 * `color` defaults to --color-ink; pass "white" for dark backgrounds.
 */
export function Logo({
  size = 21,
  color = "var(--color-ink)",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <span
      style={{
        fontFamily: "var(--font-outfit, Outfit, system-ui, sans-serif)",
        fontSize: size,
        fontWeight: 600,
        letterSpacing: "-0.01em",
        color,
        lineHeight: 1,
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      Meal
      <EggO size={size} />
      day
    </span>
  );
}

/**
 * App icon: dark rounded tile with centered egg.
 * Used only for favicon / apple-icon — never in the header/footer lockup.
 */
export function AppIcon({ size = 34 }: { size?: number }) {
  return (
    <span
      aria-label="Mealoday"
      role="img"
      style={{
        display: "inline-grid",
        placeItems: "center",
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        background: "var(--color-ink)",
        flexShrink: 0,
      }}
    >
      <Egg size={Math.round(size * 0.6)} />
    </span>
  );
}
