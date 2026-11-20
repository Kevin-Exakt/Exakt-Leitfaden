import Link from "next/link";
import { ChevronRight, Inbox } from "lucide-react";
import type { Auftraggeber, Kunde } from "@/src/content/schema";
import { getRepository } from "@/src/content/repository";
import { EntwurfBadge } from "../ui/Karte";

function Leer({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-karte p-8 text-center text-text-leise">
      <Inbox className="size-10" aria-hidden />
      <p>{text}</p>
    </div>
  );
}

const ZEILE = "flex min-h-16 items-center gap-3 rounded-xl border border-rand bg-karte px-4 py-3 hover:bg-flaeche";

/**
 * Kundenauswahl eines Auftraggebers; verlinkt auf `${basis}/${kunde}`.
 * Hat der Auftraggeber nur einen Kunden (z. B. Retec), werden direkt dessen Systeme gezeigt.
 */
export function KundenAuswahl({ auftraggeber, basis }: { auftraggeber: Auftraggeber; basis: string }) {
  if (!auftraggeber.kunden.length) return <Leer text={`Für ${auftraggeber.name} sind noch keine Kunden hinterlegt.`} />;
  if (auftraggeber.kunden.length === 1) {
    const kunde = auftraggeber.kunden[0];
    return <SystemAuswahl kunde={kunde} basis={`${basis}/${kunde.id}`} />;
  }
  return (
    <div className="space-y-2">
      {auftraggeber.kunden.map((k) => {
        const anzahl = k.systeme.length;
        return (
          <Link key={k.id} href={`${basis}/${k.id}`} className={ZEILE}>
            <span className="flex-1">
              <span className="block text-lg font-semibold">{k.name}</span>
              <span className="block text-sm text-text-leise">
                {anzahl === 0 ? "Noch keine Systeme" : anzahl === 1 ? "1 System" : `${anzahl} Systeme`}
              </span>
            </span>
            <ChevronRight className="size-5 text-text-leise" aria-hidden />
          </Link>
        );
      })}
    </div>
  );
}

/** System → Hersteller eines Kunden; verlinkt auf `${basis}/${system}/${variante}`. */
export function SystemAuswahl({ kunde, basis }: { kunde: Kunde; basis: string }) {
  const repo = getRepository();
  if (!kunde.systeme.length) return <Leer text={`Für ${kunde.name} sind noch keine Systeme hinterlegt.`} />;
  return (
    <div className="space-y-6">
      {kunde.systeme.map((s) => (
        <section key={s.id} className="space-y-2">
          <h2 className="text-xl font-bold">{s.name}</h2>
          <p className="text-sm text-text-leise">Hersteller auswählen</p>
          <div className="space-y-2">
            {s.varianten.map((v) => (
              <Link key={v.id} href={`${basis}/${s.id}/${v.id}`} className={ZEILE}>
                <span className="flex-1">
                  <span className="block text-lg font-semibold">{repo.getHersteller(v.hersteller)?.name ?? v.hersteller}</span>
                  {v.status === "entwurf" && <EntwurfBadge />}
                </span>
                <ChevronRight className="size-5 text-text-leise" aria-hidden />
              </Link>
            ))}
            {s.varianten.length === 0 && <p className="text-text-leise">Noch keine Hersteller hinterlegt.</p>}
          </div>
        </section>
      ))}
    </div>
  );
}
