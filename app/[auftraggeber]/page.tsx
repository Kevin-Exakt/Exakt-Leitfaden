import { notFound } from "next/navigation";
import { getRepository } from "@/src/content/repository";
import { auftraggeberParams, variantenNamen } from "@/src/content/navigation";
import { Kopf, Seite } from "@/src/components/ui/Rahmen";
import { KundenAuswahl } from "@/src/components/techniker/VariantenAuswahl";
import { LaufenderEinsatz } from "@/src/components/techniker/LaufenderEinsatz";

export function generateStaticParams() {
  return auftraggeberParams();
}

/** Auftraggeber → Kunde wählen (bei nur einem Kunden direkt die Systeme). */
export default async function KundeWaehlen({ params }: PageProps<"/[auftraggeber]">) {
  const { auftraggeber: auftraggeberId } = await params;
  const auftraggeber = getRepository().getAuftraggeber(auftraggeberId);
  if (!auftraggeber) notFound();
  const einKunde = auftraggeber.kunden.length === 1;
  return (
    <Seite
      kopf={<Kopf titel={auftraggeber.name} unterzeile={einKunde ? "System und Hersteller wählen" : "Kunde wählen"} zurueck="/" />}
    >
      <LaufenderEinsatz auftraggeber={auftraggeber.id} namen={variantenNamen(auftraggeber.id)} />
      <KundenAuswahl auftraggeber={auftraggeber} basis={`/${auftraggeber.id}`} />
    </Seite>
  );
}
