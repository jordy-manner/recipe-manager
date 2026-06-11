import { Brand } from "./top-bar";

export function SiteFooter({ recipeCount }: { recipeCount?: number }) {
  const release = process.env.APP_RELEASE ?? "dev";
  return (
    <footer className="mt-14 border-t border-line bg-surface">
      <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-start justify-between gap-6 px-[18px] pb-12 pt-[60px] sm:px-8">
        <div className="flex flex-col gap-3">
          <Brand />
          <p className="text-[13.5px] text-ink-faint">
            Cuisine maison pour tous
            {recipeCount != null && ` · ${recipeCount} recette${recipeCount > 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 text-right">
          <p className="text-[13.5px] text-ink-faint">
            © {new Date().getFullYear()} Marmite. Tous droits réservés.
          </p>
          <span className="rounded-md bg-surface-2 px-2.5 py-1 font-mono text-[12px] text-ink-faint">
            Release {release}
          </span>
        </div>
      </div>
    </footer>
  );
}
