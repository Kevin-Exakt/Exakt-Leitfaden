import Link from "next/link";
import { ChevronRight, Inbox } from "lucide-react";
import type { Auftraggeber } from "@/src/content/schema";
import { getRepository } from "@/src/content/repository";
import { EntwurfBadge } from "../ui/Karte";

/** Liste Kunde → System → Hersteller; verlinkt auf `${basis}/${kunde}/${system}/${variante}`. */
export function VariantenAuswahl({ auftraggeber, basis }: { auftraggeber: Auftraggeber; basis: string }) {
  const repo = getRepository();
  const kunden = auftraggeber.kunden.filter((b) => b.systeme.length > 0);

  if (!kunden.length)
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-karte p-8 text-center text-text-leise">
        <Inbox className="size-10" aria-hidden />
        <p>Für {auftraggeber.name} sind noch keine Systeme hinterlegt.</p>
      </div>
    );

  return (
    <div className="space-y-8">
      {kunden.map((b) => (
        <section key={b.id} className="space-y-4">
          {/* Kundenüberschrift nur, wenn es mehrere Kunden gibt */}
          {kunden.length > 1 && <h2 className="text-sm font-semibold uppercase tracking-wide text-text-leise">{b.name}</h2>}
          {b.systeme.map((s) => (
            <div key={s.id} className="space-y-2">
              <h3 className="text-xl font-bold">
                {kunden.length === 1 && <span className="font-normal text-text-leise">{b.name} · </span>}
                {s.name}
              </h3>
              <p className="text-sm text-text-leise">Hersteller auswählen</p>
              <div className="space-y-2">
                {s.varianten.map((v) => (
                  <Link
                    key={v.id}
                    href={`${basis}/${b.id}/${s.id}/${v.id}`}
                    className="flex min-h-16 items-center gap-3 rounded-xl border border-rand bg-karte px-4 py-3 hover:bg-flaeche"
                  >
                    <span className="flex-1">
                      <span className="block text-lg font-semibold">{repo.getHersteller(v.hersteller)?.name ?? v.hersteller}</span>
                      {v.status === "entwurf" && <EntwurfBadge />}
                    </span>
                    <ChevronRight className="size-5 text-text-leise" aria-hidden />
                  </Link>
                ))}
                {s.varianten.length === 0 && <p className="text-text-leise">Noch keine Hersteller hinterlegt.</p>}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
