import { Logo } from "./Logo";

export function SiteFooter({ recipeCount }: { recipeCount?: number }) {
  const release = process.env.APP_RELEASE ?? "dev";
  return (
    <footer className="mt-14 border-t border-white/[0.08] bg-ink">
      <div className="mx-auto flex w-full max-w-content flex-wrap items-center justify-between gap-6 px-[18px] pb-12 pt-[60px] sm:px-8">
        <div className="flex flex-col items-center gap-2">
          <Logo size={42} color="white" />
          <p
            style={{
              fontFamily: "var(--font-outfit, Outfit, system-ui, sans-serif)",
              fontWeight: 600,
              fontSize: 12,
              letterSpacing: "0.05em",
              color: "rgba(255,255,255,0.6)",
              lineHeight: 1,
              textAlign: "center",
            }}
          >
            Orchestrer vos menus
            {recipeCount != null && ` · ${recipeCount} recette${recipeCount > 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 text-right">
          <p className="text-[13.5px] text-white/50">
            © {new Date().getFullYear()} Mealoday. Tous droits réservés.
          </p>
          <span className="rounded-md bg-white/[0.08] px-2.5 py-1 font-mono text-[12px] text-white/[0.62]">
            Release {release}
          </span>
        </div>
      </div>
    </footer>
  );
}
