import Link from "next/link";
import { Icon } from "../components/icons";
import { SETTINGS_NAV } from "./_nav";

// Desktop: the side rail handles navigation — main area stays empty until a section is picked.
// Mobile: rail is stacked above content; this page adds a grouped overview so the
// user sees all sections instead of being immediately redirected to one.
export default function SettingsIndexPage() {
  return (
    <section className="sm:hidden">
      <h1 className="mb-6 font-display text-[28px] font-extrabold tracking-[-0.02em] text-ink">
        Paramètres
      </h1>
      <div className="flex flex-col gap-5">
        {SETTINGS_NAV.map((g) => (
          <div key={g.group}>
            <p className="mb-2 px-1 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">
              {g.group}
            </p>
            <ul className="flex flex-col gap-1">
              {g.items.map((it) => (
                <li key={it.slug}>
                  <Link
                    href={`/parametres/${it.slug}`}
                    className="flex items-center gap-3 rounded-input bg-surface px-4 py-3 transition hover:bg-surface-muted"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-surface-muted text-ink-soft">
                      <Icon name={it.icon} size={18} />
                    </span>
                    <span className="flex-1 text-[15px] font-semibold text-ink-soft">
                      {it.label}
                    </span>
                    <Icon name="chevron" size={16} className="shrink-0 rotate-90 text-ink-faint" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
