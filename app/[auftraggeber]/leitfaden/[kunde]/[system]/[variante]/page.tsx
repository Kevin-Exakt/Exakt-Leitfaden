import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import type { FlowTyp } from "@/src/content/schema";
import { alleVarianten, variantenParams } from "@/src/content/navigation";
import { Bloecke } from "@/src/components/blocks/Bloecke";
import { Abschnitt, EntwurfBadge, Karte } from "@/src/components/ui/Karte";
import { Kopf, Seite } from "@/src/components/ui/Rahmen";

export function generateStaticParams() {
  return variantenParams();
}

export const metadata = { title: "Leitfaden" };

const GRUPPEN: { typ: FlowTyp; titel: string }[] = [
  { typ: "funktionstest", titel: "Funktionstest" },
  { typ: "diagnose", titel: "Fehleranalyse" },
  { typ: "rueckwaerts", titel: "Rückwärtsverfahren" },
  { typ: "reparatur", titel: "Reparaturleitfäden" },
];

export default async function VariantenLeitfaden({ params }: PageProps<"/[auftraggeber]/leitfaden/[kunde]/[system]/[variante]">) {
  const p = await params;
  const x = alleVarianten().find(
    (y) => y.auftraggeber === p.auftraggeber && y.kunde === p.kunde && y.system === p.system && y.variante === p.variante,
  );
  if (!x) notFound();
  const { v } = x;
  const basis = `/${p.auftraggeber}/leitfaden/${p.kunde}/${p.system}/${p.variante}`;
  const flows = Object.values(v.flows);
  const listen = [
    ["Werkzeug", v.vorbereitung.werkzeug],
    ["Messgeräte", v.vorbereitung.messgeraete],
    ["Material", v.vorbereitung.material],
    ["Ersatzteile", v.vorbereitung.ersatzteile],
    ["Dokumente", v.vorbereitung.dokumente],
  ] as const;

  return (
    <Seite kopf={<Kopf titel={`${x.systemName} · ${x.herstellerName}`} unterzeile={`${x.kundeName} · Leitfaden`} zurueck={`/${p.auftraggeber}/leitfaden/${p.kunde}`} />}>
      {v.status === "entwurf" && <EntwurfBadge />}

      {GRUPPEN.map((g) => {
        const liste = flows.filter((f) => f.typ === g.typ);
        if (!liste.length) return null;
        return (
          <Abschnitt key={g.typ} titel={g.titel}>
            <div className="space-y-2">
              {liste.map((f) => (
                <Link
                  key={f.id}
                  href={`${basis}/${f.id}`}
                  className="flex min-h-14 items-center gap-3 rounded-xl border border-rand bg-karte px-4 py-3 font-semibold hover:bg-flaeche"
                >
                  <span className="flex-1">{f.titel}</span>
                  <ChevronRight className="size-5 text-text-leise" aria-hidden />
                </Link>
              ))}
            </div>
          </Abschnitt>
        );
      })}

      <Abschnitt titel="Vorbereitung">
        <Bloecke bloecke={v.vorbereitung.hinweise} />
        <Karte className="space-y-3">
          {listen.map(([titel, eintraege]) =>
            eintraege.length ? (
              <div key={titel}>
                <p className="font-semibold">{titel}</p>
                <ul className="list-inside list-disc text-text-leise">
                  {eintraege.map((e) => (
                    <li key={e.id}>
                      {e.name}
                      {e.menge && ` (${e.menge})`}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null,
          )}
        </Karte>
      </Abschnitt>
    </Seite>
  );
}
