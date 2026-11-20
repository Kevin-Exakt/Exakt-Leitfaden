import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Kunde } from "@/src/content/schema";
import { getRepository } from "@/src/content/repository";
import { EntwurfBadge } from "../ui/Karte";

/** Liste System → Hersteller; verlinkt auf `${basis}/${bereich}/${system}/${variante}`. */
export function VariantenAuswahl({ kunde, basis }: { kunde: Kunde; basis: string }) {
  const repo = getRepository();
  return (
    <div className="space-y-6">
      {kunde.bereiche.flatMap((b) =>
        b.systeme.map((s) => (
          <section key={`${b.id}/${s.id}`} className="space-y-2">
            <h2 className="text-xl font-bold">{s.name}</h2>
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
          </section>
        )),
      )}
    </div>
  );
}
