import { Egg, Logo } from "./Logo";

// Page-transition loader: full-screen dark overlay with egg bubble + sonar halos.
// Server-safe — rendered as Suspense fallback during navigation.
export function Loader() {
  return (
    <div
      role="status"
      aria-label="Chargement"
      className="fixed inset-0 z-[100] flex animate-fade-in flex-col items-center justify-center gap-6 bg-bg px-6"
    >
      <div className="relative grid place-items-center">
        {/* Sonar halos behind the bubble. */}
        <span aria-hidden="true" className="animate-halo absolute h-28 w-28 rounded-full bg-accent-soft" />
        <span aria-hidden="true" className="animate-halo absolute h-28 w-28 rounded-full bg-accent/20 [animation-delay:0.85s]" />
        {/* Dark bubble with egg (not terracotta, not the M-bars). */}
        <span className="animate-breathe relative grid h-28 w-28 place-items-center rounded-full bg-ink shadow-card-lg">
          <Egg className="h-[60px] w-[60px]" />
        </span>
      </div>

      <div className="flex flex-col items-center gap-2.5">
        <Logo size={26} color="var(--color-ink)" />
        <span className="flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.16em] text-ink-faint">
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
