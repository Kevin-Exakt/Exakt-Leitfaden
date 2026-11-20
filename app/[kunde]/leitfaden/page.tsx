import { notFound } from "next/navigation";
import { getRepository } from "@/src/content/repository";
import { kundenParams } from "@/src/content/navigation";
import { Kopf, Seite } from "@/src/components/ui/Rahmen";
import { VariantenAuswahl } from "@/src/components/techniker/VariantenAuswahl";

export function generateStaticParams() {
  return kundenParams();
}

export const metadata = { title: "Leitfäden" };

export default async function LeitfadenAuswahl({ params }: PageProps<"/[kunde]/leitfaden">) {
  const { kunde: kundeId } = await params;
  const kunde = getRepository().getKunde(kundeId);
  if (!kunde) notFound();
  return (
    <Seite kopf={<Kopf titel="Systeme / Leitfäden" unterzeile="Nachschlagen ohne Einsatz" zurueck={`/${kunde.id}`} />}>
      <VariantenAuswahl kunde={kunde} basis={`/${kunde.id}/leitfaden`} />
    </Seite>
  );
}
