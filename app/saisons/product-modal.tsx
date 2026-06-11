"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Icon } from "../components/icons";

/** Drawer wrapper for the intercepted product route: overlay, slide-in, ESC,
 * click-outside, and close = back (which removes the intercepted segment). */
export function ProductModal({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") router.back();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [router]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) router.back();
      }}
      className="animate-fade-in fixed inset-0 z-[60] flex justify-end bg-ink/35 backdrop-blur-[2px]"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="animate-slide-in relative h-full w-[min(460px,100%)] overflow-y-auto bg-bg shadow-card-lg outline-none"
      >
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Fermer"
          className="absolute right-4 top-4 z-[3] grid h-[38px] w-[38px] place-items-center rounded-full bg-surface/90 text-ink shadow-card transition hover:text-accent"
        >
          <Icon name="x" size={18} />
        </button>
        {children}
      </div>
    </div>
  );
}
