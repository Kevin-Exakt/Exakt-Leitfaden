import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

/** Mobile Seitenspalte: Kopf oben, Inhalt, Aktionsleiste unten in der Daumenzone. */
export function Seite({ kopf, children, leiste }: { kopf: ReactNode; children: ReactNode; leiste?: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col">
      {kopf}
      <main className="flex-1 space-y-5 px-4 py-5">{children}</main>
      {leiste && <Aktionsleiste>{leiste}</Aktionsleiste>}
    </div>
  );
}

export function Aktionsleiste({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 border-t border-rand bg-flaeche/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
      <div className="space-y-2">{children}</div>
    </div>
  );
}

/** Einfacher Kopf mit optionalem Zurück-Link (für Auswahlseiten). */
export function Kopf({ titel, unterzeile, zurueck }: { titel: string; unterzeile?: string; zurueck?: string }) {
  return (
    <header className="sticky top-0 z-10 border-b border-rand bg-karte/95 backdrop-blur">
      <div className="flex min-h-14 items-center gap-2 px-2">
        {zurueck ? (
          <Link href={zurueck} aria-label="Zurück" className="flex size-11 items-center justify-center rounded-lg hover:bg-flaeche">
            <ChevronLeft className="size-6" />
          </Link>
        ) : (
          <Marke />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{titel}</p>
          {unterzeile && <p className="truncate text-sm text-text-leise">{unterzeile}</p>}
        </div>
      </div>
      <div className="h-1 bg-akzent" />
    </header>
  );
}

/** Platzhalter-Marke, bis das Logo geliefert wird. */
export function Marke() {
  return (
    <span className="ml-2 mr-1 flex size-9 items-center justify-center rounded-lg bg-akzent text-lg font-black text-tinte" aria-label="Exakt-Service">
      E
    </span>
  );
}
