/** Egg SVG (fried-egg / œuf au plat), viewBox 0 0 100 100. */
function EggSVG({ size = 96, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="11 4 76 76"
      fill="none"
      className={className}
    >
      <path
        d="M50 6c20 0 30 14 34 30 4 17-3 32-18 38-4 1.6-9 3-16 3s-14-1.2-19-4C18 67 12 53 16 36 20 19 30 6 50 6Z"
        fill="#fff"
      />
      <circle cx="52" cy="50" r="21" fill="#f5c700" />
      <circle cx="52" cy="50" r="21" fill="none" stroke="#e0a800" strokeWidth="2" />
      <ellipse cx="44" cy="42" rx="6" ry="8" fill="#fff" opacity="0.85" />
    </svg>
  );
}

/** Standalone egg — used in the loader bubble. */
export function Egg({ className = "", size }: { className?: string; size?: number }) {
  return <EggSVG size={size ?? 60} className={className} />;
}

/**
 * "SUR LE PLAT" wordmark: egg inline + Bangers cartoon text.
 * Pass color="white" only for contexts where the cartoon stroke still shows —
 * the wordmark style is always the yellow+navy treatment regardless.
 */
export function Logo({ size = 21 }: { size?: number }) {
  const eggSize = Math.round(size * 1.3);
  return (
    <span
      aria-label="Sur le Plat"
      role="img"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: Math.round(size * 0.24),
        lineHeight: 1,
      }}
    >
      <EggSVG size={eggSize} />
      <span
        style={{
          fontFamily: "var(--font-bangers, Bangers, cursive)",
          fontWeight: 400,
          fontSize: size,
          letterSpacing: "0.03em",
          textTransform: "uppercase",
          color: "#f5c700",
          WebkitTextStroke: `${Math.max(1, size * 0.07)}px #16181f`,
          paintOrder: "stroke fill",
          textShadow: `-1px 1px 0 #15223d, -2px 2px 0 #15223d, -3px 3px 0 #15223d`,
          whiteSpace: "nowrap",
        }}
      >
        Sur le Plat
      </span>
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
      aria-label="Sur le Plat"
      role="img"
      style={{
        display: "inline-grid",
        placeItems: "center",
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        background: "#151517",
        flexShrink: 0,
      }}
    >
      <EggSVG size={Math.round(size * 0.6)} />
    </span>
  );
}
