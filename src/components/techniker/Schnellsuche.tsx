"use client";
import Link from "next/link";
import { ChevronRight, CircleAlert, Search, Wrench, X } from "lucide-react";
import { useMemo, useState } from "react";
import { suche, type SuchEintrag } from "@/src/suche/suche";

/** Suchfeld auf der Startseite – führt direkt zum System oder zum Fehlerbild im Leitfaden. */
export function Schnellsuche({ index }: { index: SuchEintrag[] }) {
  const [eingabe, setEingabe] = useState("");
  const treffer = useMemo(() => suche(index, eingabe), [index, eingabe]);
  const aktiv = eingabe.trim().length > 0;

  return (
    <div className="space-y-2">
      <label className="relative block">
        <span className="sr-only">Suche</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-text-leise" aria-hidden />
        <input
          type="text"
          inputMode="search"
          value={eingabe}
          onChange={(e) => setEingabe(e.target.value)}
          placeholder="Suchen, z. B. „ITAB ZT schließt nicht“"
          autoComplete="off"
          enterKeyHint="search"
          className="min-h-14 w-full rounded-xl border-2 border-rand bg-karte pl-12 pr-12 text-lg outline-none placeholder:text-slate-400 focus:border-akzent-hover"
        />
        {aktiv && (
          <button
            type="button"
            onClick={() => setEingabe("")}
            aria-label="Suche leeren"
            className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-text-leise hover:bg-flaeche"
          >
            <X className="size-5" />
          </button>
        )}
      </label>

      {aktiv && (
        <div className="space-y-2" aria-live="polite">
          {treffer.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-karte p-4 text-center text-text-leise">
              Nichts gefunden. Andere Wörter versuchen oder unten auswählen.
            </p>
          ) : (
            treffer.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="flex min-h-16 items-center gap-3 rounded-xl border border-rand bg-karte px-4 py-3 hover:bg-flaeche"
              >
                {t.art === "fehlerbild" ? (
                  <CircleAlert className="size-5 shrink-0 text-warnung" aria-label="Fehlerbild" />
                ) : (
                  <Wrench className="size-5 shrink-0 text-text-leise" aria-label="System" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{t.titel}</span>
                  <span className="block truncate text-sm text-text-leise">{t.unterzeile}</span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-text-leise" aria-hidden />
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
