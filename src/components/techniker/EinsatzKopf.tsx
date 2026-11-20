"use client";
import { ChevronLeft, Menu, X } from "lucide-react";
import { useState } from "react";
import { ANZAHL_POSITIONEN } from "@/src/einsatz/einsatz";
import { Button } from "../ui/Button";

export function EinsatzKopf({
  nummer,
  titel,
  unterzeile,
  position,
  onZurueck,
  zurueckMoeglich,
  menue,
}: {
  nummer: string;
  titel: string;
  unterzeile: string;
  position: number;
  onZurueck: () => void;
  zurueckMoeglich: boolean;
  menue: (schliessen: () => void) => React.ReactNode;
}) {
  const [offen, setOffen] = useState(false);
  const fortschritt = Math.min(100, Math.round((position / ANZAHL_POSITIONEN) * 100));

  return (
    <header className="sticky top-0 z-20 border-b border-rand bg-karte/95 backdrop-blur">
      <div className="flex min-h-14 items-center gap-1 px-2">
        <button
          type="button"
          onClick={onZurueck}
          disabled={!zurueckMoeglich}
          aria-label="Zurück"
          className="flex size-11 items-center justify-center rounded-lg hover:bg-flaeche disabled:opacity-30"
        >
          <ChevronLeft className="size-6" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">
            <span className="mr-2 inline-flex min-w-8 justify-center rounded-md bg-akzent px-1.5 text-sm font-bold text-tinte">
              {nummer}
            </span>
            {titel}
          </p>
          <p className="truncate text-sm text-text-leise">{unterzeile}</p>
        </div>
        <button
          type="button"
          onClick={() => setOffen(!offen)}
          aria-label="Menü"
          aria-expanded={offen}
          className="flex size-11 items-center justify-center rounded-lg hover:bg-flaeche"
        >
          {offen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>
      <div className="h-1.5 bg-slate-200" role="progressbar" aria-valuenow={fortschritt} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-akzent transition-[width]" style={{ width: `${fortschritt}%` }} />
      </div>
      {offen && (
        <div className="max-h-[75dvh] space-y-3 overflow-auto border-b border-rand bg-karte p-4 shadow-lg">
          {menue(() => setOffen(false))}
          <Button variante="leise" gross={false} breit onClick={() => setOffen(false)}>
            Schließen
          </Button>
        </div>
      )}
    </header>
  );
}
