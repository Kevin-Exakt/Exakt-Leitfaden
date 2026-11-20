import Link from "next/link";
import { ChevronRight, Inbox } from "lucide-react";
import { leitfadenVorhanden, type Auftraggeber, type Kunde, type System, type Variante } from "@/src/content/schema";
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

function Status({ v }: { v?: Variante }) {
  if (!v || !leitfadenVorhanden(v)) return <span className="block text-sm text-text-leise">Leitfaden folgt</span>;
  return v.status === "entwurf" ? <EntwurfBadge /> : null;
}

/** System ohne Herstellerauswahl: keine Variante oder genau eine ohne `hersteller`. */
export function istDirektesSystem(s: System): boolean {
  return s.varianten.length === 0 || (s.varianten.length === 1 && !s.varianten[0].hersteller);
}

/**
 * Systeme eines Kunden. Systeme mit Herstellern zeigen die Herstellerauswahl,
 * Systeme ohne Hersteller sind direkt antippbar.
 */
export function SystemAuswahl({ kunde, basis }: { kunde: Kunde; basis: string }) {
  const repo = getRepository();
  if (!kunde.systeme.length) return <Leer text={`Für ${kunde.name} sind noch keine Systeme hinterlegt.`} />;
  return (
    <div className="space-y-3">
      {kunde.systeme.map((s) => {
        if (istDirektesSystem(s)) {
          const v = s.varianten[0];
          return (
            <Link key={s.id} href={v ? `${basis}/${s.id}/${v.id}` : `${basis}/${s.id}`} className={ZEILE}>
              <span className="flex-1">
                <span className="block text-xl font-bold">{s.name}</span>
                <Status v={v} />
              </span>
              <ChevronRight className="size-5 text-text-leise" aria-hidden />
            </Link>
          );
        }
        return (
          <section key={s.id} className="space-y-2 pt-3">
            <h2 className="text-xl font-bold">{s.name}</h2>
            <p className="text-sm text-text-leise">Hersteller auswählen</p>
            <div className="space-y-2">
              {s.varianten.map((v) => (
                <Link key={v.id} href={`${basis}/${s.id}/${v.id}`} className={ZEILE}>
                  <span className="flex-1">
                    <span className="block text-lg font-semibold">
                      {v.name ?? (v.hersteller ? (repo.getHersteller(v.hersteller)?.name ?? v.hersteller) : s.name)}
                    </span>
                    <Status v={v} />
                  </span>
                  <ChevronRight className="size-5 text-text-leise" aria-hidden />
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
