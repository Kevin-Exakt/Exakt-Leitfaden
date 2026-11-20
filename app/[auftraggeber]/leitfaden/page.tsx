import { notFound } from "next/navigation";
import { getRepository } from "@/src/content/repository";
import { auftraggeberParams } from "@/src/content/navigation";
import { Kopf, Seite } from "@/src/components/ui/Rahmen";
import { KundenAuswahl } from "@/src/components/techniker/VariantenAuswahl";

export function generateStaticParams() {
  return auftraggeberParams();
}

export const metadata = { title: "Leitfäden" };

export default async function LeitfadenKundeWaehlen({ params }: PageProps<"/[auftraggeber]/leitfaden">) {
  const { auftraggeber: auftraggeberId } = await params;
  const auftraggeber = getRepository().getAuftraggeber(auftraggeberId);
  if (!auftraggeber) notFound();
  return (
    <Seite
      kopf={
        <Kopf
          titel={`Leitfäden · ${auftraggeber.name}`}
          unterzeile={auftraggeber.kunden.length === 1 ? "Nachschlagen ohne Einsatz" : "Kunde wählen"}
          zurueck={`/${auftraggeber.id}`}
        />
      }
    >
      <KundenAuswahl auftraggeber={auftraggeber} basis={`/${auftraggeber.id}/leitfaden`} />
    </Seite>
  );
}
