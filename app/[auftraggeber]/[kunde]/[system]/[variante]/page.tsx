import { notFound } from "next/navigation";
import { FileClock } from "lucide-react";
import { alleVarianten, variantenParams } from "@/src/content/navigation";
import { getRepository } from "@/src/content/repository";
import { leitfadenVorhanden } from "@/src/content/schema";
import { EinsatzApp } from "@/src/components/techniker/EinsatzApp";
import { ButtonLink } from "@/src/components/ui/Button";
import { Kopf, Seite } from "@/src/components/ui/Rahmen";

export function generateStaticParams() {
  return variantenParams();
}

export const metadata = { title: "Leitfaden" };

export default async function LeitfadenSeite({ params }: PageProps<"/[auftraggeber]/[kunde]/[system]/[variante]">) {
  const p = await params;
  const eintrag = alleVarianten().find(
    (x) => x.auftraggeber === p.auftraggeber && x.kunde === p.kunde && x.system === p.system && x.variante === p.variante,
  );
  const auftraggeber = getRepository().getAuftraggeber(p.auftraggeber);
  if (!eintrag || !auftraggeber) notFound();
  const auswahlUrl = `/${auftraggeber.id}/${p.kunde}`;

  // Hersteller ist angelegt, aber Funktionstest/Fehlerbilder fehlen noch
  if (!leitfadenVorhanden(eintrag.v)) {
    return (
      <Seite
        kopf={
          <Kopf
            titel={eintrag.titel}
            unterzeile={auftraggeber.kunden.length === 1 ? auftraggeber.name : `${auftraggeber.name} · ${eintrag.kundeName}`}
            zurueck={auswahlUrl}
          />
        }
      >
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-karte p-8 text-center">
          <FileClock className="size-10 text-text-leise" aria-hidden />
          <p className="text-lg font-semibold">Leitfaden folgt</p>
          <p className="text-text-leise">
            Für {eintrag.titel} ist noch kein Leitfaden hinterlegt. Bei Fragen bitte den
            Innendienst kontaktieren.
          </p>
        </div>
        <ButtonLink href={auswahlUrl} breit>
          Zurück zur Auswahl
        </ButtonLink>
      </Seite>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col">
      <EinsatzApp
        pfad={{ auftraggeber: p.auftraggeber, kunde: p.kunde, system: p.system, variante: p.variante }}
        bezeichnung={{
          auftraggeber: auftraggeber.kunden.length === 1 ? auftraggeber.name : `${auftraggeber.name} · ${eintrag.kundeName}`,
          system: eintrag.systemName,
          hersteller: eintrag.herstellerName ?? "",
        }}
        variante={eintrag.v}
        auftraggeber={{ links: auftraggeber.links, ankunft: eintrag.ankunft }}
        startUrl={`/${auftraggeber.id}`}
        auswahlUrl={auswahlUrl}
      />
    </div>
  );
}
