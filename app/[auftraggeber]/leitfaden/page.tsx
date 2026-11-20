import { notFound } from "next/navigation";
import { getRepository } from "@/src/content/repository";
import { auftraggeberParams } from "@/src/content/navigation";
import { Kopf, Seite } from "@/src/components/ui/Rahmen";
import { VariantenAuswahl } from "@/src/components/techniker/VariantenAuswahl";

export function generateStaticParams() {
  return auftraggeberParams();
}

export const metadata = { title: "Leitfäden" };

export default async function LeitfadenAuswahl({ params }: PageProps<"/[auftraggeber]/leitfaden">) {
  const { auftraggeber: auftraggeberId } = await params;
  const auftraggeber = getRepository().getAuftraggeber(auftraggeberId);
  if (!auftraggeber) notFound();
  return (
    <Seite kopf={<Kopf titel="Systeme / Leitfäden" unterzeile="Nachschlagen ohne Einsatz" zurueck={`/${auftraggeber.id}`} />}>
      <VariantenAuswahl auftraggeber={auftraggeber} basis={`/${auftraggeber.id}/leitfaden`} />
    </Seite>
  );
}
