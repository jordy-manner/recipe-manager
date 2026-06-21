import { Egg } from "./Logo";

// Page-transition loader: full-screen overlay, opaque immediately (no fade-in
// — avoids revealing the screen behind during page transitions).
// Theme-aware via CSS classes: dark = #101012 bg/bubble, light = eggshell bg + shadow.
export function Loader() {
  return (
    <div
      role="status"
      aria-label="Chargement"
      className="loader-wrap fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{ gap: "28px" }}
    >
      <div className="relative grid place-items-center">
        {/* Yellow halos — present in both themes */}
        <span
          aria-hidden="true"
          className="animate-halo absolute h-32 w-32 rounded-full"
          style={{ background: "rgb(245 199 0 / 0.22)" }}
        />
        <span
          aria-hidden="true"
          className="animate-halo absolute h-32 w-32 rounded-full [animation-delay:0.85s]"
          style={{ background: "rgb(245 199 0 / 0.12)" }}
        />
        {/* Bubble: dark #101012 / light eggshell + shadow */}
        <span className="loader-bubble animate-breathe relative grid h-32 w-32 place-items-center rounded-full">
          {/* loader-egg adds drop-shadow in light mode */}
          <span className="loader-egg">
            <Egg size={96} />
          </span>
        </span>
      </div>

      <div className="flex flex-col items-center" style={{ gap: "12px" }}>
        {/* Wordmark text-only — no egg icon (egg lives exclusively in the bubble above). */}
        <span
          aria-hidden="true"
          style={{
            fontFamily: "var(--font-bangers, Bangers, cursive)",
            fontWeight: 400,
            fontSize: "46px",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "#f5c700",
            WebkitTextStroke: "3px #16181f",
            paintOrder: "stroke fill",
            textShadow: "-1px 1px 0 #15223d, -2px 2px 0 #15223d, -3px 3px 0 #15223d, -4px 4px 0 #15223d, -5px 5px 0 #15223d, -6px 6px 0 #15223d",
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          Sur le Plat
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.18em] text-ink-faint">
          Ça mijote
          <span className="flex items-end gap-1">
            <span className="animate-dot h-[5px] w-[5px] rounded-full bg-accent" />
            <span className="animate-dot h-[5px] w-[5px] rounded-full bg-accent [animation-delay:0.15s]" />
            <span className="animate-dot h-[5px] w-[5px] rounded-full bg-accent [animation-delay:0.3s]" />
          </span>
        </span>
      </div>
    </div>
  );
}
