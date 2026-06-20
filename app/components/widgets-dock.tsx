"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Icon, type IconName } from "./icons";

// Floating kitchen-widgets dock, mounted once in the root layout (global chrome,
// like the notification bell). A round launcher (bottom-right) expands a list of
// widgets from a small REGISTRY; each opens in a reusable popin (bottom-sheet on
// mobile). First widget: a multi-timer (Simple + egg cooking). Living in the
// layout, the dock never unmounts on SPA navigation, so running timers survive
// route changes. Styling uses theme tokens only (DESIGN.md); the alert ring uses
// the `animate-flash` keyframe from globals.css.

type WidgetId = "timer" | "convert" | "portions" | "notes";

type WidgetDef = {
  id: WidgetId;
  name: string;
  desc: string;
  icon: IconName;
  soon?: boolean;
};

// Extensible registry — add a widget = one entry (+ a render branch in the popin).
const WIDGETS: WidgetDef[] = [
  { id: "timer", name: "Minuteur", desc: "Simple + cuisson des œufs", icon: "timer" },
  { id: "convert", name: "Convertisseur", desc: "g, ml, tasses…", icon: "scale", soon: true },
  { id: "portions", name: "Portions", desc: "Recalcule les quantités", icon: "users", soon: true },
  { id: "notes", name: "Notes", desc: "Pense-bête de cuisine", icon: "note", soon: true },
];

/* ---- egg cooking model (boiling-water plunge, calibrated) ---- */

type Doneness = "coque" | "mollet" | "dur";
type EggSize = "petit" | "moyen" | "gros" | "tresgros";
type EggTemp = "frigo" | "ambiant";

// Reference: 4 eggs, room temperature. Seconds per doneness × size.
const EGG_TABLE: Record<Doneness, Record<EggSize, number>> = {
  coque: { petit: 235, moyen: 265, gros: 295, tresgros: 315 },
  mollet: { petit: 295, moyen: 325, gros: 355, tresgros: 385 },
  dur: { petit: 525, moyen: 565, gros: 615, tresgros: 665 },
};
const EGG_TEMP: Record<EggTemp, number> = { frigo: 60, ambiant: 0 };
const DONE_LABEL: Record<Doneness, string> = { coque: "à la coque", mollet: "mollet", dur: "dur" };

const eggTime = (doneness: Doneness, size: EggSize, temp: EggTemp, count: number) =>
  EGG_TABLE[doneness][size] + EGG_TEMP[temp] + (count - 4) * 15;

const mmss = (s: number) => {
  s = Math.max(0, Math.round(s));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/* ---- timer state ---- */

type TimerKind = "simple" | "egg";
type RunningTimer = {
  id: number;
  label: string;
  kind: TimerKind;
  total: number;
  remaining: number; // authoritative when paused; derived from endsAt when running
  endsAt: number | null; // wall-clock deadline (ms) when running, null when paused/stopped
  running: boolean;
  ringing: boolean;
};

/* ---- progress ring ---- */

function Ring({ pct, icon, size = 38 }: { pct: number; icon: IconName; size?: number }) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface-muted)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset .3s linear" }}
        />
      </svg>
      <Icon name={icon} size={15} />
    </div>
  );
}

/* ---- segmented control ---- */

function Seg<T extends string>({
  value,
  onChange,
  options,
  soft,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
  soft?: boolean;
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex overflow-hidden rounded-[11px] border border-line bg-surface">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={
            "flex-1 border-r border-line p-[9px] text-[13px] font-semibold transition last:border-r-0 " +
            (value === v
              ? soft
                ? "bg-accent-soft text-accent-ink"
                : "bg-accent text-[#151517]"
              : "text-ink-soft hover:bg-surface-muted")
          }
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/* ---- the dock ---- */

export function WidgetsDock() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [popin, setPopin] = useState<WidgetId | null>(null);
  const [mode, setMode] = useState<TimerKind>("simple");
  const [timers, setTimers] = useState<RunningTimer[]>([]);
  const [flash, setFlash] = useState(false);

  // Simple-mode inputs.
  const [min, setMin] = useState(3);
  const [sec, setSec] = useState(0);
  // Egg-mode inputs.
  const [doneness, setDoneness] = useState<Doneness>("mollet");
  const [temp, setTemp] = useState<EggTemp>("frigo");
  const [size, setSize] = useState<EggSize>("moyen");
  const [count, setCount] = useState(4);
  const eggT = eggTime(doneness, size, temp, count);

  const seq = useRef(0);
  const acRef = useRef<AudioContext | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const titleId = useId();

  // Tick every 250 ms; derive remaining from wall-clock deadline so background
  // throttling (locked screen, backgrounded tab) doesn't cause drift.
  useEffect(() => {
    const iv = setInterval(
      () =>
        setTimers((ts) =>
          ts.map((t) => {
            if (!t.running || t.ringing || t.endsAt === null) return t;
            const remaining = (t.endsAt - Date.now()) / 1000;
            if (remaining <= 0) {
              fireAlert();
              return { ...t, remaining: 0, endsAt: null, running: false, ringing: true };
            }
            return { ...t, remaining };
          }),
        ),
      250,
    );
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close the menu on outside click.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  // One reused AudioContext (resumed on each beep) — avoids spawning a new
  // context per beep across the repeating alarm.
  const beep = useCallback(() => {
    try {
      if (!acRef.current) {
        const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        acRef.current = new Ctx();
      }
      const ac = acRef.current;
      if (ac.state === "suspended") void ac.resume();
      const tone = (t0: number) => {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.type = "sine";
        o.frequency.value = 880;
        o.connect(g);
        g.connect(ac.destination);
        g.gain.setValueAtTime(0.0001, ac.currentTime + t0);
        g.gain.exponentialRampToValueAtTime(0.3, ac.currentTime + t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + t0 + 0.32);
        o.start(ac.currentTime + t0);
        o.stop(ac.currentTime + t0 + 0.34);
      };
      tone(0);
      tone(0.4);
      tone(0.8);
    } catch {
      // Audio needs a prior user gesture; ignore if blocked.
    }
  }, []);

  // Reopen + flash the popin when a timer fires (the recurring beep/vibration is
  // driven by the `hasRinging` effect below, so it keeps going until stopped).
  const fireAlert = useCallback(() => {
    setPopin("timer");
    setFlash(true);
    setTimeout(() => setFlash(false), 2600);
  }, []);

  const addTimer = (label: string, kind: TimerKind, total: number) => {
    if (total <= 0) return;
    setTimers((ts) => [...ts, { id: ++seq.current, label, kind, total, remaining: total, endsAt: Date.now() + total * 1000, running: true, ringing: false }]);
    setPopin(null);
  };
  const toggle = (id: number) =>
    setTimers((ts) =>
      ts.map((t) => {
        if (t.id !== id) return t;
        if (t.ringing) return { ...t, running: false, ringing: false, remaining: t.total, endsAt: null };
        if (t.running) {
          // Pause: snapshot remaining from wall clock so resume is accurate
          const remaining = t.endsAt !== null ? Math.max(0, (t.endsAt - Date.now()) / 1000) : t.remaining;
          return { ...t, running: false, remaining, endsAt: null };
        }
        // Resume: recompute deadline from stored remaining
        return { ...t, running: true, endsAt: Date.now() + t.remaining * 1000 };
      }),
    );
  const resetTimer = (id: number) =>
    setTimers((ts) => ts.map((t) => (t.id === id ? { ...t, remaining: t.total, endsAt: null, running: false, ringing: false } : t)));
  const remove = (id: number) => setTimers((ts) => ts.filter((t) => t.id !== id));

  const running = timers.filter((t) => t.running || t.ringing);

  // Sustained alarm: while at least one timer is ringing, beep + vibrate every
  // ~1.8 s for up to 1 minute, or until the user stops it (no timer ringing →
  // effect cleanup). Vibration is mobile-only (no-op elsewhere).
  const hasRinging = timers.some((t) => t.ringing);
  useEffect(() => {
    if (!hasRinging) return;
    const pulse = () => {
      beep();
      navigator.vibrate?.([400, 200, 400]);
    };
    pulse();
    const iv = setInterval(pulse, 1800);
    const stop = setTimeout(() => clearInterval(iv), 60_000);
    return () => {
      clearInterval(iv);
      clearTimeout(stop);
      navigator.vibrate?.(0); // cancel any ongoing vibration
    };
  }, [hasRinging, beep]);

  // Popin a11y: focus the dialog on open, trap Tab, Escape closes.
  useEffect(() => {
    if (!popin) return;
    const prev = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => prev?.focus?.();
  }, [popin]);

  const onDialogKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setPopin(null);
      return;
    }
    if (e.key !== "Tab") return;
    const nodes = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button, input, [tabindex]:not([tabindex="-1"])',
    );
    if (!nodes || !nodes.length) return;
    const list = Array.from(nodes).filter((n) => !n.hasAttribute("disabled"));
    const first = list[0];
    const last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const launch = () =>
    mode === "simple"
      ? addTimer("Minuteur", "simple", min * 60 + sec)
      : addTimer(`${count} œuf${count > 1 ? "s" : ""} · ${DONE_LABEL[doneness]}`, "egg", eggT);

  return (
    <>
      {/* dock (launcher + minimized pills) */}
      <div
        ref={dockRef}
        className="fixed bottom-[92px] right-3.5 z-[120] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6"
      >
        {/* minimized timer pills (hidden while the popin is open) */}
        {!popin && timers.length > 0 && (
          <div className="flex flex-col items-end gap-2.5">
            {timers.map((t) => (
              <div
                key={t.id}
                role="button"
                tabIndex={0}
                onClick={() => setPopin("timer")}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setPopin("timer")}
                className={
                  "flex cursor-pointer items-center gap-2.5 rounded-full border bg-surface py-2 pl-2 pr-3.5 shadow-card-lg transition animate-fade-up hover:-translate-y-0.5 " +
                  (t.ringing ? "border-accent animate-flash" : "border-line")
                }
              >
                <Ring pct={t.ringing ? 1 : t.total ? t.remaining / t.total : 0} icon={t.kind === "egg" ? "egg" : "timer"} />
                <div className="flex min-w-0 flex-col leading-tight">
                  <span className="font-mono text-[15px] font-medium text-ink">
                    {t.ringing ? "À retirer !" : mmss(t.remaining)}
                  </span>
                  <span className="max-w-[130px] truncate text-[11px] text-ink-faint">{t.label}</span>
                </div>
                <button
                  type="button"
                  aria-label="Supprimer le minuteur"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(t.id);
                  }}
                  className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-surface-muted text-ink-faint transition hover:bg-line hover:text-ink"
                >
                  <Icon name="x" size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* expanded widget list */}
        {menuOpen && (
          <div
            id={menuId}
            role="menu"
            aria-label="Widgets"
            className="w-[248px] rounded-[20px] border border-line bg-surface p-2 shadow-card-lg animate-fade-up"
          >
            <div className="flex items-center gap-2 px-2.5 pb-2.5 pt-2">
              <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-accent text-[#151517]">
                <Icon name="grid" size={17} />
              </span>
              <span className="flex-1 font-display text-[17px] font-semibold text-ink">Widgets</span>
            </div>
            {WIDGETS.map((w) => (
              <button
                key={w.id}
                type="button"
                role="menuitem"
                disabled={w.soon}
                onClick={() => {
                  if (w.soon) return;
                  setPopin(w.id);
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-surface-muted disabled:cursor-default disabled:opacity-55 disabled:hover:bg-transparent"
              >
                <span
                  className={
                    "grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[11px] " +
                    (w.soon ? "bg-surface-muted text-ink-faint" : "bg-accent-soft text-accent-ink")
                  }
                >
                  <Icon name={w.icon} size={18} />
                </span>
                <span className="flex min-w-0 flex-col">
                  <b className="text-[14.5px] font-bold text-ink">{w.name}</b>
                  <span className="text-xs text-ink-faint">{w.desc}</span>
                </span>
                {w.soon && (
                  <span className="ml-auto rounded-full bg-surface-muted px-1.5 py-[3px] font-mono text-[9.5px] uppercase tracking-[0.08em] text-ink-faint">
                    à venir
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* launcher FAB */}
        <button
          ref={fabRef}
          type="button"
          aria-label="Widgets"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-controls={menuOpen ? menuId : undefined}
          onClick={() => setMenuOpen((o) => !o)}
          className="relative grid h-[54px] w-[54px] place-items-center rounded-full bg-accent text-[#151517] shadow-card-lg transition hover:-translate-y-0.5 hover:bg-accent-deep sm:h-[60px] sm:w-[60px]"
        >
          <Icon name={menuOpen ? "x" : "grid"} size={24} strokeWidth={2} />
          {running.length > 0 && (
            <span className="absolute -right-1 -top-1 grid h-[22px] min-w-[22px] place-items-center rounded-full border-2 border-bg bg-ink px-1.5 font-mono text-[11px] font-bold text-bg">
              {running.length}
            </span>
          )}
        </button>
      </div>

      {/* popin (timer) — bottom-sheet on mobile */}
      {popin === "timer" && (
        <div
          className="fixed inset-0 z-[130] flex items-end justify-center bg-ink/35 p-0 backdrop-blur-[2px] animate-fade-in sm:justify-end sm:p-6"
          onClick={() => setPopin(null)}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            onKeyDown={onDialogKeyDown}
            onClick={(e) => e.stopPropagation()}
            className={
              "max-h-[86vh] w-full overflow-y-auto rounded-t-[26px] border border-line bg-surface shadow-card-lg outline-none animate-sheet-up sm:max-h-[calc(100vh-48px)] sm:w-[380px] sm:rounded-[30px] sm:animate-fade-up " +
              (flash ? "animate-flash" : "")
            }
          >
            {/* header */}
            <div className="sticky top-0 flex items-center gap-2.5 rounded-t-[26px] bg-accent-soft px-[18px] py-4 sm:rounded-t-[30px]">
              <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-accent text-[#151517]">
                <Icon name="timer" size={19} />
              </span>
              <span id={titleId} className="flex-1 font-display text-[22px] font-semibold text-accent-ink">
                Minuteur
              </span>
              <button
                type="button"
                onClick={() => setPopin(null)}
                aria-label="Réduire"
                title="Réduire"
                className="grid h-[34px] w-[34px] place-items-center rounded-full bg-white/60 text-accent-ink transition hover:bg-white"
              >
                <Icon name="chevron" size={18} />
              </button>
            </div>

            {/* mode tabs */}
            <div className="flex gap-1 px-[18px] pt-3.5">
              {(["simple", "egg"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={
                    "inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border p-2.5 text-sm font-bold transition " +
                    (mode === m
                      ? "border-transparent bg-accent-soft text-accent-ink"
                      : "border-line bg-surface text-ink-soft hover:bg-surface-muted")
                  }
                >
                  <Icon name={m === "simple" ? "timer" : "egg"} size={17} /> {m === "simple" ? "Simple" : "Œufs"}
                </button>
              ))}
            </div>

            {/* body */}
            <div className="flex flex-col gap-4 p-[18px]">
              {mode === "simple" ? (
                <>
                  <div className="flex items-end justify-center gap-1.5">
                    <div className="flex flex-col items-center gap-1.5">
                      <button type="button" aria-label="Plus une minute" onClick={() => setMin((m) => Math.min(180, m + 1))} className="grid h-[26px] w-[30px] place-items-center rounded-lg border border-line bg-surface text-ink-soft transition hover:bg-surface-muted hover:text-ink">
                        <Icon name="plus" size={15} />
                      </button>
                      <input
                        aria-label="Minutes"
                        inputMode="numeric"
                        value={String(min).padStart(2, "0")}
                        onChange={(e) => setMin(Math.max(0, Math.min(180, +e.target.value.replace(/\D/g, "") || 0)))}
                        className="w-[78px] rounded-xl border border-line bg-bg py-2 text-center font-mono text-[30px] font-medium text-ink outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-soft)]"
                      />
                      <button type="button" aria-label="Moins une minute" onClick={() => setMin((m) => Math.max(0, m - 1))} className="grid h-[26px] w-[30px] place-items-center rounded-lg border border-line bg-surface text-ink-soft transition hover:bg-surface-muted hover:text-ink">
                        <Icon name="minus" size={15} />
                      </button>
                      <span className="font-mono text-[11px] uppercase tracking-widest text-ink-faint">min</span>
                    </div>
                    <span className="pb-[42px] font-mono text-[30px] text-ink-faint">:</span>
                    <div className="flex flex-col items-center gap-1.5">
                      <button type="button" aria-label="Plus cinq secondes" onClick={() => setSec((s) => (s + 5) % 60)} className="grid h-[26px] w-[30px] place-items-center rounded-lg border border-line bg-surface text-ink-soft transition hover:bg-surface-muted hover:text-ink">
                        <Icon name="plus" size={15} />
                      </button>
                      <input
                        aria-label="Secondes"
                        inputMode="numeric"
                        value={String(sec).padStart(2, "0")}
                        onChange={(e) => setSec(Math.max(0, Math.min(59, +e.target.value.replace(/\D/g, "") || 0)))}
                        className="w-[78px] rounded-xl border border-line bg-bg py-2 text-center font-mono text-[30px] font-medium text-ink outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-soft)]"
                      />
                      <button type="button" aria-label="Moins cinq secondes" onClick={() => setSec((s) => (s + 55) % 60)} className="grid h-[26px] w-[30px] place-items-center rounded-lg border border-line bg-surface text-ink-soft transition hover:bg-surface-muted hover:text-ink">
                        <Icon name="minus" size={15} />
                      </button>
                      <span className="font-mono text-[11px] uppercase tracking-widest text-ink-faint">sec</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {([["1:00", 60], ["3:00", 180], ["5:00", 300], ["10:00", 600]] as [string, number][]).map(([label, t]) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => {
                          setMin(Math.floor(t / 60));
                          setSec(t % 60);
                        }}
                        className="rounded-full border border-line bg-surface px-3.5 py-2 text-[13.5px] font-semibold text-ink-soft transition hover:border-ink-faint hover:text-ink"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-[7px]">
                    <span className="text-[13px] font-bold text-ink">Cuisson</span>
                    <Seg ariaLabel="Cuisson" value={doneness} onChange={setDoneness} options={[["coque", "À la coque"], ["mollet", "Mollet"], ["dur", "Dur"]]} />
                  </div>
                  <div className="flex flex-col gap-[7px]">
                    <span className="text-[13px] font-bold text-ink">Température des œufs</span>
                    <Seg ariaLabel="Température des œufs" soft value={temp} onChange={setTemp} options={[["frigo", "Sortie frigo"], ["ambiant", "Ambiante"]]} />
                  </div>
                  <div className="flex flex-col gap-[7px]">
                    <span className="text-[13px] font-bold text-ink">Taille</span>
                    <Seg ariaLabel="Taille" value={size} onChange={setSize} options={[["petit", "Petit"], ["moyen", "Moyen"], ["gros", "Gros"], ["tresgros", "Très gros"]]} />
                  </div>
                  <div className="flex flex-col gap-[7px]">
                    <span className="text-[13px] font-bold text-ink">Nombre d&apos;œufs</span>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center overflow-hidden rounded-[11px] border border-line">
                        <button type="button" aria-label="Un œuf de moins" onClick={() => setCount((c) => Math.max(1, c - 1))} className="grid h-10 w-10 place-items-center bg-surface text-ink transition hover:bg-surface-muted">
                          <Icon name="minus" size={18} />
                        </button>
                        <span className="min-w-[42px] text-center font-mono text-[17px]">{count}</span>
                        <button type="button" aria-label="Un œuf de plus" onClick={() => setCount((c) => Math.min(12, c + 1))} className="grid h-10 w-10 place-items-center bg-surface text-ink transition hover:bg-surface-muted">
                          <Icon name="plus" size={18} />
                        </button>
                      </div>
                      <div className="flex flex-1 items-center justify-between gap-3 rounded-[14px] bg-accent-soft px-4 py-3">
                        <span className="text-[12.5px] font-bold uppercase tracking-wide text-accent-ink">Temps</span>
                        <span className="font-mono text-[26px] font-medium text-accent-ink">{mmss(eggT)}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={launch}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent p-3 text-[15px] font-bold text-[#151517] shadow-card transition hover:bg-accent-deep"
              >
                <Icon name="play" size={18} /> Lancer le minuteur
              </button>

              {timers.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-ink-faint">Minuteurs en cours</span>
                  {timers.map((t) => (
                    <div
                      key={t.id}
                      className={
                        "flex items-center gap-2.5 rounded-[14px] border px-3 py-2.5 " +
                        (t.ringing ? "border-accent bg-accent-soft" : "border-line-soft bg-bg")
                      }
                    >
                      <Ring pct={t.ringing ? 1 : t.total ? t.remaining / t.total : 0} icon={t.kind === "egg" ? "egg" : "timer"} />
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-[18px] font-medium text-ink">{t.ringing ? "À retirer !" : mmss(t.remaining)}</div>
                        <div className="truncate text-xs text-ink-faint">{t.label}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggle(t.id)}
                        title={t.ringing ? "Relancer" : t.running ? "Pause" : "Reprendre"}
                        aria-label={t.ringing ? "Relancer" : t.running ? "Pause" : "Reprendre"}
                        className="grid h-8 w-8 place-items-center rounded-full bg-surface-muted text-ink-soft transition hover:bg-line hover:text-ink"
                      >
                        <Icon name={t.running ? "pause" : "play"} size={15} />
                      </button>
                      {!t.ringing && (
                        <button type="button" onClick={() => resetTimer(t.id)} title="Réinitialiser" aria-label="Réinitialiser" className="grid h-8 w-8 place-items-center rounded-full bg-surface-muted text-ink-soft transition hover:bg-line hover:text-ink">
                          <Icon name="refresh" size={15} />
                        </button>
                      )}
                      <button type="button" onClick={() => remove(t.id)} title="Supprimer" aria-label="Supprimer" className="grid h-8 w-8 place-items-center rounded-full bg-surface-muted text-ink-soft transition hover:bg-line hover:text-ink">
                        <Icon name="x" size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
