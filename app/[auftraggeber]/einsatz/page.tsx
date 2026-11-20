import { notFound } from "next/navigation";
import { getRepository } from "@/src/content/repository";
import { auftraggeberParams } from "@/src/content/navigation";
import { Kopf, Seite } from "@/src/components/ui/Rahmen";
import { KundenAuswahl } from "@/src/components/techniker/VariantenAuswahl";

export function generateStaticParams() {
  return auftraggeberParams();
}

export const metadata = { title: "Service starten" };

export default async function KundeWaehlen({ params }: PageProps<"/[auftraggeber]/einsatz">) {
  const { auftraggeber: auftraggeberId } = await params;
  const auftraggeber = getRepository().getAuftraggeber(auftraggeberId);
  if (!auftraggeber) notFound();
  const einKunde = auftraggeber.kunden.length === 1;
  return (
    <Seite
      kopf={
        <Kopf
          titel={`Service starten · ${auftraggeber.name}`}
          unterzeile={einKunde ? "System und Hersteller wählen" : "Kunde wählen"}
          zurueck={`/${auftraggeber.id}`}
        />
      }
    >
      <KundenAuswahl auftraggeber={auftraggeber} basis={`/${auftraggeber.id}/einsatz`} />
    </Seite>
  );
}
