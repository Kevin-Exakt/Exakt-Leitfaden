import { notFound } from "next/navigation";
import { getRepository } from "@/src/content/repository";
import { auftraggeberParams } from "@/src/content/navigation";
import { Kopf, Seite } from "@/src/components/ui/Rahmen";
import { VariantenAuswahl } from "@/src/components/techniker/VariantenAuswahl";

export function generateStaticParams() {
  return auftraggeberParams();
}

export const metadata = { title: "Service starten" };

export default async function SystemAuswahl({ params }: PageProps<"/[auftraggeber]/einsatz">) {
  const { auftraggeber: auftraggeberId } = await params;
  const auftraggeber = getRepository().getAuftraggeber(auftraggeberId);
  if (!auftraggeber) notFound();
  return (
    <Seite kopf={<Kopf titel="Service starten" unterzeile="System und Hersteller wählen" zurueck={`/${auftraggeber.id}`} />}>
      <VariantenAuswahl auftraggeber={auftraggeber} basis={`/${auftraggeber.id}/einsatz`} />
    </Seite>
  );
}
