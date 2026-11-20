import type { ReactNode } from "react";

export function Karte({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-rand bg-karte p-4 ${className}`}>{children}</div>;
}

export function Abschnitt({ titel, children, aktion }: { titel: string; children: ReactNode; aktion?: ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-leise">{titel}</h2>
        {aktion}
      </div>
      {children}
    </section>
  );
}

/** Kennzeichnung nicht freigegebener Inhalte. */
export function EntwurfBadge() {
  return (
    <span className="inline-flex items-center rounded-md border border-dashed border-slate-400 px-2 py-0.5 text-xs font-medium text-text-leise">
      Entwurf · nicht fachlich freigegeben
    </span>
  );
}
